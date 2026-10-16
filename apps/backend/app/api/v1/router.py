from fastapi import APIRouter

from app.api.v1.endpoints import analytics, attendance, audit, auth, cameras, classes, face_encodings, notifications, rules, settings, students, users

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(classes.router, prefix="/classes", tags=["classes"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(face_encodings.router, prefix="/face-encodings", tags=["face-encodings"])
api_router.include_router(attendance.router, prefix="/attendance", tags=["attendance"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(audit.router, prefix="/audit", tags=["audit"])
api_router.include_router(cameras.router, prefix="/cameras", tags=["cameras"])
api_router.include_router(rules.router, prefix="/rules", tags=["rules"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
