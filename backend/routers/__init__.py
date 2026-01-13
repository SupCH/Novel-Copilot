from routers.projects import router as projects_router
from routers.characters import router as characters_router
from routers.relationships import router as relationships_router
from routers.chapters import router as chapters_router
from routers.ai import router as ai_router
from routers.data_io import router as data_io_router
from routers.data_tables import router as data_tables_router

__all__ = [
    "projects_router",
    "characters_router",
    "relationships_router",
    "chapters_router",
    "ai_router",
    "data_io_router",
    "data_tables_router",
]

