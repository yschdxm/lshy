"""
种子数据 — 系统首次启动时自动填充演示数据
答辩要点：预置真实的灵山景区数据，展示系统完整功能
"""
import json
from sqlalchemy.orm import Session

from app.models.scenic_spot import ScenicSpot
from app.models.knowledge_document import KnowledgeDocument
from app.models.digital_human_config import DigitalHumanConfig
from app.models.route import Route


def init_seed_data(db: Session):
    """首次启动时初始化种子数据，已有数据则跳过"""
    if db.query(ScenicSpot).count() > 0:
        return  # 已有数据，跳过

    # ==================== 景点数据 ====================
    spots = [
        ScenicSpot(
            scenic_area_name="灵山风景名胜区",
            spot_id="LS-001",
            spot_name="山门广场",
            location="景区正门入口处",
            parameters="占地约 5000㎡，含游客服务中心",
            core_function="游客集散、票务服务、景区导览起点",
            cultural_meaning="灵山文化第一印象区，展示灵山千年文化底蕴",
            detail_intro="灵山山门广场是进入灵山风景名胜区的第一站，广场中央矗立着高达 9.9 米的灵山宝鼎，四周环绕着文化长廊，展示了灵山自唐代以来的历史变迁。广场设有游客服务中心、自助售票机和导游服务站。",
            highlights="灵山宝鼎、文化长廊、全景导览图、音乐喷泉",
            opening_info="全天开放，游客服务中心 8:00-17:00",
            notes="建议在此领取景区导览图，了解当天演艺活动安排",
            tags=json.dumps(["游客中心", "票务", "拍照打卡", "集散"], ensure_ascii=False),
            recommended_duration=20,
            crowd_level="所有人群",
            latitude=30.0123,
            longitude=118.1234,
            sort_order=1,
        ),
        ScenicSpot(
            scenic_area_name="灵山风景名胜区",
            spot_id="LS-002",
            spot_name="灵山峰顶",
            location="灵山主峰，海拔 1280 米",
            parameters="主峰观景台面积约 300㎡，可同时容纳 200 人",
            core_function="观日出、云海、全景俯瞰",
            cultural_meaning="灵山之巅，自古为文人墨客登高赋诗之处，有'登灵山而小天下'之说",
            detail_intro="灵山峰顶是景区的核心景点，海拔 1280 米，登顶后可俯瞰整个灵山山脉。晴日清晨可观壮丽日出和云海奇观，是摄影爱好者的天堂。山顶建有观景亭和祈福台，每年吸引大量游客前来登高祈福。",
            highlights="日出云海、登高祈福、360°全景、摄影胜地",
            opening_info="索道运营 7:30-17:00，徒步通道全天开放",
            notes="清晨登山注意保暖，山顶温差较大；索道末班 17:00",
            tags=json.dumps(["自然风光", "拍照打卡", "日出", "登山", "祈福"], ensure_ascii=False),
            recommended_duration=90,
            crowd_level="摄影爱好者、年轻人、登山爱好者",
            latitude=30.0456,
            longitude=118.1567,
            sort_order=2,
        ),
        ScenicSpot(
            scenic_area_name="灵山风景名胜区",
            spot_id="LS-003",
            spot_name="千年古佛寺",
            location="灵山半山腰，距山门约 1.5 公里",
            parameters="占地面积约 12000㎡，大雄宝殿高 18 米",
            core_function="礼佛参拜、文化研学、建筑赏析",
            cultural_meaning="始建于唐代贞观年间（公元 627 年），距今 1400 余年，是国家级重点文物保护单位，内有唐代摩崖石刻 36 处",
            detail_intro="古佛寺是灵山最古老的人文景观，始建于唐代，历经宋、明、清各代修缮扩建。寺内供奉释迦牟尼金身佛像，珍藏宋代铜钟一口、明代木雕十八罗汉等珍贵文物。寺后的摩崖石刻群是全国重点文物保护单位。",
            highlights="大雄宝殿礼佛、摩崖石刻、千年古钟、素斋体验",
            opening_info="7:30-17:30，初一十五 5:00 开放",
            notes="入寺请衣着得体，殿内请勿拍照；素斋 11:00-13:00",
            tags=json.dumps(["佛教文化", "历史古迹", "亲子", "祈福", "文化研学"], ensure_ascii=False),
            recommended_duration=60,
            crowd_level="祈福朝圣者、历史文化爱好者、亲子家庭、老年人",
            latitude=30.0345,
            longitude=118.1401,
            sort_order=3,
        ),
        ScenicSpot(
            scenic_area_name="灵山风景名胜区",
            spot_id="LS-004",
            spot_name="翠云溪",
            location="灵山北麓山谷，全长约 3 公里",
            parameters="溪谷全长 3 公里，落差约 150 米，沿途大小瀑布 7 处",
            core_function="亲水徒步、避暑休闲、自然科普",
            cultural_meaning="传说为灵山仙人洗药之地，溪水富含矿物质，有'仙水溪'之美誉",
            detail_intro="翠云溪是一条蜿蜒在山谷中的清澈溪流，两岸植被茂密，林木葱郁。沿溪而上可欣赏大小瀑布 7 处，溪水清澈见底，夏季平均气温比市区低 5-8°C，是避暑胜地。溪边设有栈道和观景平台，适合全家休闲徒步。",
            highlights="溯溪徒步、瀑布群、负氧离子高、夏季避暑",
            opening_info="8:00-17:00，雨季注意安全",
            notes="建议穿防滑鞋，部分路段较湿滑；儿童需成人陪同",
            tags=json.dumps(["自然风光", "亲子", "徒步", "避暑", "拍照打卡"], ensure_ascii=False),
            recommended_duration=90,
            crowd_level="亲子家庭、年轻人、摄影爱好者、自然爱好者",
            latitude=30.0289,
            longitude=118.1320,
            sort_order=4,
        ),
        ScenicSpot(
            scenic_area_name="灵山风景名胜区",
            spot_id="LS-005",
            spot_name="望月亭",
            location="灵山东侧望月峰，海拔约 900 米",
            parameters="亭高 8 米，双层八角，视野覆盖 270°",
            core_function="观景休憩、日落观赏、中秋赏月",
            cultural_meaning="始建于宋代，历代文人常在此雅集赏月吟诗，留有大量诗词碑刻",
            detail_intro="望月亭坐落于望月峰顶，是灵山最佳日落观赏点。亭为双层八角攒尖顶建筑，古色古香。登亭远眺，群山连绵，夕阳西下时霞光万道。每逢中秋，这里更是赏月胜地，常有诗词雅集活动。",
            highlights="日落观景台、碑刻诗词、180°全景、中秋雅集",
            opening_info="8:00-18:00（日落时分最佳）",
            notes="黄昏时段游客较多，建议提前到达占据好位置",
            tags=json.dumps(["观景台", "拍照打卡", "日落", "历史古迹"], ensure_ascii=False),
            recommended_duration=40,
            crowd_level="摄影爱好者、情侣、文化爱好者、所有人群",
            latitude=30.0412,
            longitude=118.1289,
            sort_order=5,
        ),
    ]

    # ==================== 知识库文档 ====================
    docs = [
        KnowledgeDocument(
            title="灵山景区概况",
            category="景点资料",
            content="灵山风景名胜区位于安徽省南部，总面积约 120 平方公里，主峰海拔 1280 米。景区以奇峰、怪石、云海、古寺、溪谷闻名，是国家 5A 级旅游景区。景区内有大小景点 48 处，其中核心景点包括灵山峰顶、千年古佛寺、翠云溪谷、望月亭等。景区全年开放，最佳游览季节为春秋两季。",
            status="已发布",
        ),
        KnowledgeDocument(
            title="古佛寺历史沿革",
            category="历史文化",
            content="古佛寺始建于唐贞观年间（公元 627 年），由高僧慧远法师开山。唐代有'灵山佛国'之称，鼎盛时期僧众逾千人。寺内大雄宝殿为明代建筑，藏经楼保留宋版《大藏经》残卷。1961 年被列为国家级重点文物保护单位。2010 年进行全面修缮，恢复了唐代建筑风貌。",
            status="已发布",
        ),
        KnowledgeDocument(
            title="灵山景区开放时间及票务 FAQ",
            category="FAQ",
            content="景区开放时间：旺季（3-10月）7:00-18:00，淡季（11-2月）8:00-17:00。门票价格：成人票 120 元，学生/老人半价 60 元，1.2 米以下儿童免费。索道单程 70 元，往返 120 元。购票方式：线上（公众号、携程、美团）提前一天预约享 9 折优惠；线下（山门广场售票处）。咨询电话：0551-12345678。",
            status="已发布",
        ),
        KnowledgeDocument(
            title="灵山一日游经典路线攻略",
            category="路线攻略",
            content="经典一日游路线（约 6 小时）：山门广场（领地图）→ 索道上山至灵山峰顶（观日出/云海，1.5 小时）→ 步行下山经古佛寺（参访、午餐素斋，1 小时）→ 翠云溪徒步（1.5 小时）→ 望月亭看日落（40 分钟）→ 返回山门。建议早上 7:30 前到达景区，避开人流高峰。",
            status="已发布",
        ),
        KnowledgeDocument(
            title="灵山佛教文化探源",
            category="历史文化",
            content="灵山佛教文化始于东晋，兴盛于唐代。古佛寺是禅宗重要道场之一，'灵山指月'公案出自此处。寺后摩崖石刻包含唐代至清代的佛教经文、诗词题刻 36 处，其中以唐代书法家颜真卿题写的'佛国灵山'最为珍贵。每年农历四月初八佛诞日举行盛大浴佛法会。",
            status="已发布",
        ),
    ]

    # ==================== 数字人配置 ====================
    # avatar_id / vcn 对应讯飞交互平台已授权形象：
    #   女 = 舒窈·唐装女生 111322001 / x4_lingxiaoyue_oral
    #   男 = 风屿 111140001 / x4_lingfeizhe_oral
    # 如平台授权有变，在管理端「数字人配置」中修改即可（seed 只在空库时填充一次）
    digital_humans = [
        DigitalHumanConfig(
            name="灵儿",
            avatar_style="古风少女",
            voice_name="舒窈·唐装女生",
            avatar_id="111322001",
            vcn="x4_lingxiaoyue_oral",
            gender="女",
            image_url="/digital-human.png",
            scenes='["首页导览","景点讲解","智能问答","路线推荐"]',
            clothing_style="唐代齐胸襦裙",
            personality="温婉知性、博学多识，擅长讲解历史文化",
            greeting_text="您好！我是灵山慧游的 AI 导览员灵儿。千年灵山，一草一木皆有故事，让我带您开启一段美妙的山水人文之旅吧！",
            expression_config=json.dumps({
                "idle": "微笑", "speaking": "随内容变化", "happy": "眉眼弯弯", "surprised": "睁大眼睛",
            }, ensure_ascii=False),
            is_active=True,
        ),
        DigitalHumanConfig(
            name="灵风",
            avatar_style="现代学者",
            voice_name="风屿·男声",
            avatar_id="111140001",
            vcn="x4_lingfeizhe_oral",
            gender="男",
            image_url="/avatar.png",
            scenes='["首页导览","景点讲解","智能问答"]',
            clothing_style="户外运动休闲装",
            personality="儒雅的学者型导览，引经据典不失风趣",
            greeting_text="您好，我是AI导览员灵风。愿与您一同探寻灵山胜境的文化瑰宝。",
            expression_config=json.dumps({
                "idle": "阳光微笑",
                "speaking": "生动活泼",
                "happy": "咧嘴大笑",
                "surprised": "夸张表情",
            }, ensure_ascii=False),
            is_active=False,
        ),
    ]

    # ==================== 推荐路线 ====================
    routes = [
        Route(
            route_name="经典一日游 — 灵山精华线",
            route_type="一日游",
            duration_minutes=360,
            suitable_people="首次来访游客、时间紧凑的旅行团",
            route_spots=json.dumps(["LS-001", "LS-002", "LS-003", "LS-004", "LS-005"], ensure_ascii=False),
            route_description="从山门广场出发，乘索道登顶灵山峰顶赏云海，步行至古佛寺参访并用素斋，下午徒步翠云溪，黄昏在望月亭赏日落，全程涵盖灵山五大核心景点。",
            guide_script="欢迎来到灵山！本次旅程约需 6 小时...",
            highlights="五大核心景点全覆盖、索道体验、素斋午餐、日落观赏",
        ),
        Route(
            route_name="深度文化游 — 灵山禅意线",
            route_type="深度游",
            duration_minutes=300,
            suitable_people="文化爱好者、摄影达人、祈福朝圣者",
            route_spots=json.dumps(["LS-001", "LS-003", "LS-005"], ensure_ascii=False),
            route_description="聚焦灵山人文景观，深度探访千年古佛寺，细赏摩崖石刻，在望月亭品茶观景，适合慢节奏的文化之旅。",
            guide_script="灵山千年文脉，今日与您共赏...",
            highlights="古佛寺深度讲解、摩崖石刻欣赏、望月亭品茶、书法体验",
        ),
        Route(
            route_name="亲子欢乐游 — 灵山自然线",
            route_type="亲子游",
            duration_minutes=240,
            suitable_people="亲子家庭、老人",
            route_spots=json.dumps(["LS-001", "LS-003", "LS-004"], ensure_ascii=False),
            route_description="轻松休闲的亲子路线，避开陡峭山路，主打古寺参访和溪谷亲水，适合带着老人小孩的家庭。",
            guide_script="大朋友小朋友，欢迎来到灵山大乐园...",
            highlights="亲子互动、溪水嬉戏、素斋体验、自然科普",
        ),
    ]

    # 批量写入
    db.add_all(spots + docs + digital_humans + routes)
    db.commit()
