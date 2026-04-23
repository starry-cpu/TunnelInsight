"""
AI Service - 隧道缺陷分析服务
使用 Qwen2.5-VL-7B-Instruct + LoRA 微调模型进行图像分析
"""
from typing import Dict, Any, Optional
from PIL import Image
import time
import logging
import asyncio
from pathlib import Path
import os

from app.core.config import settings

# 设置 Hugging Face 镜像（中国大陆网络优化）
os.environ.setdefault("HF_ENDPOINT", "https://hf-mirror.com")

logger = logging.getLogger(__name__)


class AIService:
    """AI 模型服务 - 单例模式"""

    _instance = None
    _model = None
    _tokenizer = None
    _adapter_path = None
    _initialized = False  # 添加初始化标志

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            logger.info("Creating new AIService instance")
        return cls._instance

    def __init__(self):
        # 避免重复初始化
        if not AIService._initialized:
            logger.info("Initializing AIService for the first time...")
            self._initialize_model()
            AIService._initialized = True
            logger.info(f"AIService initialized. Model type: {type(self._model)}")

    def _initialize_model(self):
        """初始化模型（懒加载）"""
        try:
            logger.info("Loading AI model...")

            # 检查模型路径
            adapter_path = Path(settings.MODEL_PATH)
            if not adapter_path.exists():
                logger.warning(f"Model adapter path not found: {adapter_path}")
                logger.info("AI service will run in mock mode")
                self._model = "mock"
                return

            self._adapter_path = adapter_path

            # 尝试加载模型
            try:
                self._load_with_unsloth()

            except Exception as e:
                logger.error(f"Failed to load model with unsloth: {str(e)}")
                logger.info("Falling back to mock mode")
                self._model = "mock"

        except Exception as e:
            logger.error(f"Failed to initialize AI service: {str(e)}")
            raise

    def _load_with_unsloth(self):
        """使用 unsloth 加载模型"""
        try:
            from unsloth import FastVisionModel
            import torch

            logger.info("Loading model with unsloth...")

            # 加载基座模型（4-bit 量化）
            base_model_name = "unsloth/Qwen2.5-VL-7B-Instruct-unsloth-bnb-4bit"

            model, tokenizer = FastVisionModel.from_pretrained(
                base_model_name,
                load_in_4bit=True,
                use_gradient_checkpointing="unsloth",
            )

            logger.info("Loading LoRA adapter...")

            # 加载 LoRA 适配器
            from peft import PeftModel
            model = PeftModel.from_pretrained(
                model,
                str(self._adapter_path),
                is_trainable=False,
            )

            logger.info("Merging LoRA adapter into base model...")
            model = model.merge_and_unload()

            self._model = model
            self._tokenizer = tokenizer

            # 设置为推理模式
            FastVisionModel.for_inference(self._model)

            logger.info("AI model loaded successfully with unsloth!")

        except ImportError as e:
            logger.error(f"Required libraries not installed: {str(e)}")
            logger.error("Please install: pip install unsloth peft torch accelerate bitsandbytes")
            raise

        except Exception as e:
            logger.error(f"Failed to load model: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    async def analyze_image(
        self,
        image_path: str,
        analysis_settings: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        分析图片

        Args:
            image_path: 图片路径
            analysis_settings: 分析参数（temperature, top_k, max_tokens, top_p, instruction）

        Returns:
            包含分析结果的字典
        """
        start_time = time.time()

        try:
            logger.info(f"analyze_image called. Model type: {type(self._model)}")

            # Mock 模式（用于开发/测试）
            if isinstance(self._model, str) and self._model == "mock":
                logger.info("Running in mock mode - returning simulated result")
                await asyncio.sleep(1)  # 模拟延迟

                inference_time_ms = int((time.time() - start_time) * 1000)

                return {
                    'final_result': self._generate_mock_result(image_path),
                    'raw_response': "Mock response for development",
                    'model_used': 'qwen2.5-vl-7b-instruct-lora-mock',
                    'inference_time_ms': inference_time_ms
                }

            # 真实推理
            logger.info("Starting real inference...")
            return await self._real_inference(image_path, analysis_settings, start_time)

        except Exception as e:
            logger.error(f"Image analysis failed: {str(e)}")
            raise

    async def _real_inference(
        self,
        image_path: str,
        analysis_settings: Dict[str, Any],
        start_time: float
    ) -> Dict[str, Any]:
        """真实模型推理"""
        try:
            import torch
            from unsloth import FastVisionModel

            logger.info(f"Loading image from: {image_path}")

            # 加载图片
            image = Image.open(image_path).convert('RGB')

            # 构建消息
            instruction = analysis_settings.get(
                'instruction',
                '你是一位土木工程领域的专家，专注于隧道结构缺陷的识别与评估。'
            )

            messages = [
                {"role": "system", "content": instruction},
                {
                    "role": "user",
                    "content": [
                        {"type": "image", "image": image},
                        {"type": "text", "text": "请分析这张隧道缺陷图片，识别缺陷类型、严重程度，并给出专业的评估意见和修复建议。"}
                    ]
                }
            ]

            logger.info("Preparing input for model...")

            # 准备输入
            input_text = self._tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=False,
            )

            inputs = self._tokenizer(
                images=[image],
                text=input_text,
                return_tensors="pt",
            ).to(self._model.device)

            logger.info("Starting model generation...")

            # 生成参数
            generation_kwargs = {
                'max_new_tokens': analysis_settings.get('max_tokens', 1024),
                'temperature': analysis_settings.get('temperature', 1.0),
                'top_k': analysis_settings.get('top_k', 10),
                'top_p': analysis_settings.get('top_p', 0.95),
                'do_sample': True,
                'use_cache': True,
            }

            # 模型推理
            with torch.no_grad():
                outputs = self._model.generate(**inputs, **generation_kwargs)

            logger.info("Model generation completed, decoding output...")

            # 解码输出
            output_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False
            )

            # 提取生成的部分（去掉输入）
            if "assistant" in output_text.lower():
                output_text = output_text.split("assistant")[-1].strip()

            inference_time_ms = int((time.time() - start_time) * 1000)

            logger.info(f"Analysis completed in {inference_time_ms}ms")

            return {
                'final_result': output_text.strip(),
                'raw_response': output_text,
                'model_used': 'qwen2.5-vl-7b-instruct-lora',
                'inference_time_ms': inference_time_ms
            }

        except Exception as e:
            logger.error(f"Real inference failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    async def analyze_text(
        self,
        prompt: str,
        analysis_settings: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        分析文本（用于演变分析等纯文本任务）

        Args:
            prompt: 输入文本
            analysis_settings: 分析参数（可选）

        Returns:
            模型生成的文本响应
        """
        start_time = time.time()

        try:
            logger.info("analyze_text called")

            # Mock 模式
            if isinstance(self._model, str) and self._model == "mock":
                logger.info("Running in mock mode for text analysis")
                await asyncio.sleep(0.5)  # 模拟延迟
                return self._generate_mock_text_response(prompt)

            # 真实推理
            logger.info("Starting real text inference...")
            return await self._real_text_inference(prompt, analysis_settings or {}, start_time)

        except Exception as e:
            logger.error(f"Text analysis failed: {str(e)}")
            raise

    async def _real_text_inference(
        self,
        prompt: str,
        analysis_settings: Dict[str, Any],
        start_time: float
    ) -> str:
        """真实模型文本推理"""
        try:
            import torch

            logger.info("Preparing text input for model...")

            # 构建消息（纯文本，无图片）
            messages = [
                {"role": "user", "content": prompt}
            ]

            # 准备输入
            input_text = self._tokenizer.apply_chat_template(
                messages,
                add_generation_prompt=True,
                tokenize=False,
            )

            inputs = self._tokenizer(
                text=input_text,
                return_tensors="pt",
            ).to(self._model.device)

            logger.info("Starting text model generation...")

            # 生成参数
            generation_kwargs = {
                'max_new_tokens': analysis_settings.get('max_tokens', 1024),
                'temperature': analysis_settings.get('temperature', 0.7),
                'top_k': analysis_settings.get('top_k', 10),
                'top_p': analysis_settings.get('top_p', 0.95),
                'do_sample': True,
                'use_cache': True,
            }

            # 模型推理
            with torch.no_grad():
                outputs = self._model.generate(**inputs, **generation_kwargs)

            logger.info("Text generation completed, decoding output...")

            # 解码输出
            output_text = self._tokenizer.decode(
                outputs[0],
                skip_special_tokens=True,
                clean_up_tokenization_spaces=False
            )

            # 提取生成的部分（去掉输入）
            if "assistant" in output_text.lower():
                output_text = output_text.split("assistant")[-1].strip()

            inference_time_ms = int((time.time() - start_time) * 1000)
            logger.info(f"Text analysis completed in {inference_time_ms}ms")

            return output_text.strip()

        except Exception as e:
            logger.error(f"Real text inference failed: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            raise

    def _generate_mock_text_response(self, prompt: str) -> str:
        """生成 Mock 文本响应（用于演变分析等）"""
        import json

        # 检测是否是演变分析请求
        if "演变分析" in prompt or "deterioration_rate" in prompt:
            return json.dumps({
                "deterioration_rate": 5.0,
                "risk_level": "medium",
                "urgency_score": 5.0,
                "timeline_summary": "[Mock 模式] 分析显示缺陷在过去一段时间内保持相对稳定",
                "trend": "stable",
                "cause_analysis": "[Mock 模式] AI 服务暂不可用，无法提供具体原因分析",
                "repair_priority": "[Mock 模式] 建议定期监测，如有恶化趋势再采取修复措施",
                "future_prediction": "[Mock 模式] 预计短期内将保持当前状态"
            }, ensure_ascii=False)

        # 默认 Mock 响应
        return "[Mock 模式] AI 服务暂不可用，请稍后重试"

    def is_available(self) -> bool:
        """检查 AI 服务是否可用"""
        return self._model is not None and self._model != "mock"

    def _generate_mock_result(self, image_path: str) -> str:
        """生成 Mock 结果（用于开发/测试）"""
        return """## 隧道缺陷分析报告

### 1. 缺陷识别

**缺陷类型**: 裂缝
**位置**: 隧道左侧墙壁，桩号 K12+345
**严重程度**: 中等 (Medium)

### 2. 详细描述

在该隧道段落发现明显的结构性裂缝缺陷：
- **裂缝长度**: 约 1.5 米
- **裂缝宽度**: 2-3 毫米
- **走向**: 纵向，沿隧道延伸方向
- **深度**: 估计 10-15 厘米

### 3. 风险评估

- **结构安全风险**: 中等
- **渗水风险**: 较高
- **发展趋势**: 若不及时处理，可能继续扩展

### 4. 修复建议

#### 短期措施（1个月内）
1. 安装监测设备，跟踪裂缝变化
2. 表面封闭处理，防止渗水
3. 设置警示标识

#### 长期措施（3个月内）
1. 注浆加固处理
2. 必要时进行衬砌修复
3. 加强该区域的定期巡检

### 5. 后续监测

- **监测频率**: 每月一次复查
- **关键指标**: 裂缝宽度、长度、渗水情况
- **应急响应**: 如发现裂缝扩展速率加快，应立即采取应急措施

---
**分析时间**: 2026-02-21
**模型版本**: qwen2.5-vl-7b-instruct-lora (微调模型)
**分析置信度**: 85%
"""


# 全局单例
ai_service = AIService()