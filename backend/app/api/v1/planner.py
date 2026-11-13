from fastapi import APIRouter, Depends, HTTPException, Query
from postgrest.exceptions import APIError

from app.api.v1.deps import get_current_user
from app.models.schemas import GroceryPlan, GroceryPlanUpdate, GrocerySearchResult, MonthlyPlanner, MonthlyPlannerUpdate
from app.services.grocery_planner_service import get_grocery_plan, save_grocery_plan, search_grocery_products
from app.services.monthly_planner_service import get_monthly_planner, save_monthly_planner

router = APIRouter(prefix="/planner", tags=["Planner"])


def _planner_error_detail(exc: Exception) -> str:
    message = getattr(exc, "message", None) or str(exc)
    lowered = message.lower()
    if "monthly_plans" in lowered or "recurring_expenses" in lowered or "category_budgets" in lowered:
        return "Monthly Planner is not installed in Supabase yet. Run backend/migrations/005_monthly_planner.sql and reload the schema."
    return message


@router.get("/monthly", response_model=MonthlyPlanner)
async def get_planner_month(
    current_user: dict = Depends(get_current_user),
    month: str | None = Query(default=None, description="Month in YYYY-MM format"),
):
    try:
        return get_monthly_planner(current_user["id"], month)
    except APIError as e:
        raise HTTPException(status_code=503, detail=_planner_error_detail(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/monthly", response_model=MonthlyPlanner)
async def save_planner_month(
    body: MonthlyPlannerUpdate,
    current_user: dict = Depends(get_current_user),
    month: str | None = Query(default=None, description="Month in YYYY-MM format"),
):
    try:
        return save_monthly_planner(current_user["id"], month, body)
    except APIError as e:
        raise HTTPException(status_code=503, detail=_planner_error_detail(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grocery", response_model=GroceryPlan)
async def get_planner_grocery(
    current_user: dict = Depends(get_current_user),
    month: str | None = Query(default=None, description="Month in YYYY-MM format"),
):
    try:
        return get_grocery_plan(current_user["id"], month)
    except APIError as e:
        raise HTTPException(status_code=503, detail=_planner_error_detail(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/grocery/search", response_model=list[GrocerySearchResult])
async def search_planner_grocery(
    query: str = Query(..., min_length=2, description="Product search query"),
    store: str = Query(default="Lider", description="Store name, for example Lider or Jumbo"),
    limit: int = Query(default=5, ge=1, le=10),
):
    try:
        return search_grocery_products(store_name=store, query=query, limit=limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except APIError as e:
        raise HTTPException(status_code=503, detail=_planner_error_detail(e))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not fetch live grocery prices: {e}")


@router.put("/grocery", response_model=GroceryPlan)
async def save_planner_grocery(
    body: GroceryPlanUpdate,
    current_user: dict = Depends(get_current_user),
    month: str | None = Query(default=None, description="Month in YYYY-MM format"),
):
    try:
        return save_grocery_plan(current_user["id"], month, body)
    except APIError as e:
        raise HTTPException(status_code=503, detail=_planner_error_detail(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
