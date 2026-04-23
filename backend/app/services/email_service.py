"""Email service for sending emails"""
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
import logging
import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """邮件发送服务"""

    def __init__(self):
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USER
        self.password = settings.SMTP_PASSWORD
        self.from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        self.from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.enabled = settings.EMAIL_ENABLED

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        发送邮件

        Args:
            to_email: 收件人邮箱
            subject: 邮件主题
            html_content: HTML格式内容
            text_content: 纯文本内容(可选)

        Returns:
            bool: 是否发送成功
        """
        if not self.enabled:
            logger.warning(f"Email service is disabled. Skipping email to {to_email}")
            logger.info(f"Email content preview:\nSubject: {subject}\n{html_content}")
            return True

        try:
            # 创建邮件消息
            message = MIMEMultipart("alternative")
            message["Subject"] = subject
            message["From"] = f"{self.from_name} <{self.from_email}>"
            message["To"] = to_email

            # 添加纯文本内容
            if text_content:
                message.attach(MIMEText(text_content, "plain", "utf-8"))

            # 添加HTML内容
            message.attach(MIMEText(html_content, "html", "utf-8"))

            # 发送邮件
            await aiosmtplib.send(
                message,
                hostname=self.host,
                port=self.port,
                username=self.username,
                password=self.password,
                start_tls=self.use_tls
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_password_reset_email(
        self,
        to_email: str,
        reset_token: str,
        username: str
    ) -> bool:
        """
        发送密码重置邮件

        Args:
            to_email: 收件人邮箱
            reset_token: 重置令牌
            username: 用户名

        Returns:
            bool: 是否发送成功
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password/{reset_token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3B82F6; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }}
                .button {{ display: inline-block; background-color: #3B82F6; color: white; padding: 12px 24px;
                           text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;
                          font-size: 12px; color: #6b7280; text-align: center; }}
                .warning {{ background-color: #fef3c7; padding: 12px; border-radius: 6px;
                           margin-top: 20px; font-size: 14px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>TunnelInsight</h1>
                    <p>智慧隧道智能监测平台</p>
                </div>

                <div class="content">
                    <h2>您好，{username}！</h2>
                    <p>我们收到了重置您账户密码的请求。</p>

                    <p>请点击下面的按钮重置您的密码：</p>

                    <a href="{reset_url}" class="button">重置密码</a>

                    <p>或者复制以下链接到浏览器地址栏：</p>
                    <p style="background-color: #e5e7eb; padding: 10px; border-radius: 4px;
                       word-break: break-all; font-size: 14px;">
                        {reset_url}
                    </p>

                    <div class="warning">
                        <strong>⚠️ 重要提示：</strong>
                        <ul style="margin: 10px 0 0 0; padding-left: 20px;">
                            <li>此链接将在 <strong>{settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS}小时</strong> 后失效</li>
                            <li>如果您没有请求重置密码，请忽略此邮件</li>
                            <li>请勿将此链接分享给他人</li>
                        </ul>
                    </div>
                </div>

                <div class="footer">
                    <p>此邮件由系统自动发送，请勿直接回复。</p>
                    <p>© 2026 TunnelInsight 智能科技有限公司 版权所有</p>
                </div>
            </div>
        </body>
        </html>
        """

        text_content = f"""
您好，{username}！

我们收到了重置您账户密码的请求。

请访问以下链接重置您的密码：
{reset_url}

重要提示：
- 此链接将在 {settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS}小时 后失效
- 如果您没有请求重置密码，请忽略此邮件
- 请勿将此链接分享给他人

此邮件由系统自动发送，请勿直接回复。
© 2026 TunnelInsight 智能科技有限公司 版权所有
        """

        subject = "【TunnelInsight】重置您的密码"

        return await self.send_email(to_email, subject, html_content, text_content)

    async def send_verification_email(
        self,
        to_email: str,
        verification_token: str,
        username: str
    ) -> bool:
        """
        发送邮箱验证邮件

        Args:
            to_email: 收件人邮箱
            verification_token: 验证令牌
            username: 用户名

        Returns:
            bool: 是否发送成功
        """
        verification_url = f"{settings.FRONTEND_URL}/verify-email/{verification_token}"

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3B82F6; color: white; padding: 20px; text-align: center; }}
                .content {{ background-color: #f9fafb; padding: 30px; border-radius: 8px; margin-top: 20px; }}
                .button {{ display: inline-block; background-color: #10B981; color: white; padding: 12px 24px;
                           text-decoration: none; border-radius: 6px; margin-top: 20px; }}
                .footer {{ margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;
                          font-size: 12px; color: #6b7280; text-align: center; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>TunnelInsight</h1>
                    <p>智慧隧道智能监测平台</p>
                </div>

                <div class="content">
                    <h2>欢迎，{username}！</h2>
                    <p>感谢您注册 TunnelInsight。</p>

                    <p>请点击下面的按钮验证您的邮箱地址：</p>

                    <a href="{verification_url}" class="button">验证邮箱</a>

                    <p>或者复制以下链接到浏览器地址栏：</p>
                    <p style="background-color: #e5e7eb; padding: 10px; border-radius: 4px;
                       word-break: break-all; font-size: 14px;">
                        {verification_url}
                    </p>
                </div>

                <div class="footer">
                    <p>此邮件由系统自动发送，请勿直接回复。</p>
                    <p>© 2026 TunnelInsight 智能科技有限公司 版权所有</p>
                </div>
            </div>
        </body>
        </html>
        """

        subject = "【TunnelInsight】验证您的邮箱地址"

        return await self.send_email(to_email, subject, html_content)


# 全局邮件服务实例
email_service = EmailService()
