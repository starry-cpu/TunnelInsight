"""Service for calculating status based on severity counts."""

from typing import Dict, Optional, List, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.severity_level import severity_level
from app.crud.status_level import status_level
from app.models.severity_level import SeverityLevel
from app.models.status_level import StatusLevel


class StatusCalculator:
    """
    Calculates tunnel/project status based on defect severity counts.

    Uses a weighted scoring system:
    - Each severity level has a score_weight
    - Total score = sum(count * weight) for each severity
    - Status is determined by matching score to status level ranges
    """

    @staticmethod
    def calculate_health_index(severity_counts: Dict[str, int], unique_location_count: int) -> int:
        """
        Calculate health index using weighted density model.

        Formula:
        1. weighted_defects = 1×low + 3×medium + 8×high + 15×critical
        2. DDI = weighted_defects / max(unique_location_count, 1)
        3. base_score = 35|55|75|90|100 based on highest severity
        4. density_factor = 1 - min(0.5, DDI × 0.1)
        5. health_index = round(base_score × density_factor)

        Args:
            severity_counts: Dict with keys 'low', 'medium', 'high', 'critical'
            unique_location_count: Number of unique (stake_mark, direction) locations

        Returns:
            Health index (17-100), where 100 = no defects
        """
        # Handle empty or None
        if not severity_counts:
            severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}

        # Get counts with defaults
        low = severity_counts.get("low", 0)
        medium = severity_counts.get("medium", 0)
        high = severity_counts.get("high", 0)
        critical = severity_counts.get("critical", 0)

        # No defects = perfect health
        total_defects = low + medium + high + critical
        if total_defects == 0:
            return 100

        # Step 1: Calculate weighted defects
        weighted_defects = 1 * low + 3 * medium + 8 * high + 15 * critical

        # Step 2: Calculate defect density index
        ddi = weighted_defects / max(unique_location_count, 1)

        # Step 3: Determine base score by highest severity
        if critical > 0:
            base_score = 35
        elif high > 0:
            base_score = 55
        elif medium > 0:
            base_score = 75
        else:  # only low
            base_score = 90

        # Step 4: Calculate density factor (max 50% decay)
        density_factor = 1 - min(0.5, ddi * 0.1)

        # Step 5: Final health index
        health_index = round(base_score * density_factor)

        return health_index

    def __init__(self):
        self._severity_levels: List[SeverityLevel] = []
        self._status_levels: List[StatusLevel] = []
        self._severity_weights: Dict[str, int] = {}
        self._initialized: bool = False

    @property
    def is_initialized(self) -> bool:
        """Check if the calculator has been initialized."""
        return self._initialized

    async def initialize(self, db: AsyncSession) -> None:
        """
        Load severity and status levels from database.
        Must be called before using the calculator.
        """
        await self.refresh_cache(db)

    async def refresh_cache(self, db: AsyncSession) -> None:
        """
        Refresh the cached severity and status levels from database.
        Call this after configuration changes.
        """
        # Load active severity levels
        self._severity_levels = await severity_level.get_all_active(db)

        # Build weight lookup dict
        self._severity_weights = {level.key: level.score_weight for level in self._severity_levels}

        # Load active status levels
        self._status_levels = await status_level.get_all_active(db)

        self._initialized = True

    def calculate_score(self, severity_counts: Dict[str, int]) -> int:
        """
        Calculate total score from severity counts.

        Formula: score = sum(count * weight) for each severity level

        Args:
            severity_counts: Dict mapping severity key to count
                            e.g., {'low': 10, 'medium': 5, 'high': 2}

        Returns:
            Total calculated score (non-negative integer)
        """
        if not self._initialized:
            raise RuntimeError("StatusCalculator not initialized. Call initialize() first.")

        total_score = 0
        for severity_key, count in severity_counts.items():
            weight = self._severity_weights.get(severity_key, 0)
            total_score += count * weight

        # Ensure non-negative
        return max(0, total_score)

    def get_status_for_score(self, score: int) -> Optional[Tuple[str, str, str]]:
        """
        Get status level for a given score.

        Args:
            score: The calculated score

        Returns:
            Tuple of (key, label, color) for matching status level,
            or None if no matching status level found
        """
        if not self._initialized:
            raise RuntimeError("StatusCalculator not initialized. Call initialize() first.")

        for status in self._status_levels:
            # Check if score falls within range
            if score >= status.min_score:
                # If max_score is None, it means infinity (no upper bound)
                if status.max_score is None:
                    return (status.key, status.label, status.color)
                # Otherwise check upper bound
                if score < status.max_score:
                    return (status.key, status.label, status.color)

        return None

    def calculate_status(self, severity_counts: Dict[str, int]) -> Dict[str, Optional[str]]:
        """
        Calculate status from severity counts (convenience method).

        Args:
            severity_counts: Dict mapping severity key to count

        Returns:
            Dict with:
            - score: calculated score
            - status_key: status level key
            - status_label: status level label
            - status_color: status level color
        """
        score = self.calculate_score(severity_counts)
        status_result = self.get_status_for_score(score)

        if status_result:
            status_key, status_label, status_color = status_result
        else:
            status_key, status_label, status_color = None, None, None

        return {
            "score": score,
            "status_key": status_key,
            "status_label": status_label,
            "status_color": status_color,
        }

    def get_severity_levels(self) -> List[Dict]:
        """
        Get cached severity levels as list of dicts.
        Useful for API responses without DB queries.
        """
        return [
            {
                "id": str(level.id),
                "key": level.key,
                "label": level.label,
                "score_weight": level.score_weight,
                "color": level.color,
                "sort_order": level.sort_order,
            }
            for level in self._severity_levels
        ]

    def get_status_levels(self) -> List[Dict]:
        """
        Get cached status levels as list of dicts.
        Useful for API responses without DB queries.
        """
        return [
            {
                "id": str(level.id),
                "key": level.key,
                "label": level.label,
                "min_score": level.min_score,
                "max_score": level.max_score,
                "color": level.color,
                "sort_order": level.sort_order,
            }
            for level in self._status_levels
        ]


# Global singleton instance
status_calculator = StatusCalculator()
