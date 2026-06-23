import warnings
# إخفاء التحذيرات المزعجة الخاصة بإصدار بايثون
warnings.filterwarnings("ignore")

print("1. جاري تحميل المكتبات... (قد يستغرق بضع ثوانٍ)")
import vertexai
from vertexai.generative_models import GenerativeModel

print("2. جاري الاتصال بمشروعك في Google Cloud...")
# تهيئة الاتصال
vertexai.init(project="nukhba-492719", location="us-central1")

print("3. جاري إرسال الطلب إلى نموذج Gemini 1.5 Flash...")
model = GenerativeModel("gemini-1.5-flash-002")
response = model.generate_content(
    "مرحباً! أنا أخطط لكتابة كتاب تعليمي. هل يمكنك مساعدتي؟"
)

print("\n--- رد النموذج ---")
print(response.text)

