from fastapi import APIRouter, HTTPException, Query, Depends
from app.api.v1.deps import get_current_user
from app.services.networth_service import get_dashboard_kpis, get_snapshot_history
from app.models.schemas import DashboardKPIs, NetWorthSnapshot

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/", response_model=DashboardKPIs)
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    """
    Command Center — main KPIs.
    Returns net worth, 30-day change, assets/liabilities breakdown.
    """
    try:
        return get_dashboard_kpis(current_user["id"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/chart", response_model=list[NetWorthSnapshot])
async def get_net_worth_chart(
    current_user: dict = Depends(get_current_user),
    days: int = Query(default=90, ge=7, le=365, description="Number of days of history")
):
    """
    Net worth evolution data for the main chart.
    Returns daily snapshots ordered by date ascending.
    """
    try:
        return get_snapshot_history(current_user["id"], days=days)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
