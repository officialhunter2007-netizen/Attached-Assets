from anthropic import AnthropicVertex

PROJECT_ID = "nukhba-492719"
LOCATION = "us-east5"  # منطقة تدعم Claude 3.5
MODEL = "claude-3-5-sonnet-v2@20241022"

print(f"⏳ جاري الاتصال بنموذج {MODEL} في منطقة {LOCATION}...")

try:
    client = AnthropicVertex(region=LOCATION, project_id=PROJECT_ID)
    
    message = client.messages.create(
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "مرحباً! هل أنت متصل؟ يرجى تأكيد إصدارك باختصار."}
        ],
        model=MODEL
    )
    
    print("\n✅ الرد من النموذج:")
    print(message.content[0].text)

except Exception as e:
    print("\n❌ حدث خطأ أثناء الاتصال:")
    print(e)
