import math
from decimal import Decimal


def truncate(value: float, decimals: int = 2) -> float:
    factor = 10 ** decimals
    return math.trunc(value * factor) / factor


def to_decimal(value: float | int | None, decimals: int = 2) -> Decimal:
    if value is None:
        return Decimal("0")
    return Decimal(str(truncate(float(value), decimals)))


def format_clp(value: float | Decimal) -> str:
    """Format a number as CLP currency string."""
    return f"${int(float(value)):,}"
