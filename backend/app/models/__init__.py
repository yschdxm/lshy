"""
数据模型汇总
导入所有模型以确保 SQLAlchemy 能发现并创建所有表
"""
from app.models.scenic_spot import ScenicSpot
from app.models.knowledge_document import KnowledgeDocument
from app.models.tourist_profile import TouristProfile
from app.models.chat_record import ChatRecord
from app.models.route import Route
from app.models.digital_human_config import DigitalHumanConfig
from app.models.feedback_report import FeedbackReport
from app.models.faq_item import FaqItem
from app.models.user import User
from app.models.postcard import Postcard
from app.models.role import Role
from app.models.setting import Setting
from app.models.audit_log import AuditLog
from app.models.service_facility import ServiceFacility
from app.models.notification import Notification
