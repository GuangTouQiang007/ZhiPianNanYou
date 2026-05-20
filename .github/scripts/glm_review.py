from zhipuai import ZhipuAI
import os

# 读取代码变更内容
try:
    with open("diff.txt", "r", encoding="utf-8") as f:
        diff_content = f.read()
except FileNotFoundError:
    diff_content = "没有找到代码变更文件"

# 截断过长内容
if len(diff_content) > 3000:
    diff_content = diff_content[:3000] + "\n...(内容过长，已截断)"

if not diff_content.strip():
    diff_content = "本次没有代码变更"

# 初始化智谱客户端
api_key = os.environ.get("GLM_API_KEY")
if not api_key:
    raise ValueError("GLM_API_KEY 环境变量未设置！")

client = ZhipuAI(api_key=api_key)

print("正在调用 GLM 进行代码审查...")

# 调用 GLM-4-Flash（免费模型）
response = client.chat.completions.create(
    model="glm-4-flash",
    messages=[
        {
            "role": "user",
            "content": f"""你是一个代码审查助手，请审查以下代码变更，用中文给出简洁的反馈：

1. 代码质量是否有问题？
2. 有没有明显的 Bug？
3. 有没有可以改进的地方？

代码变更内容（git diff 格式）：
{diff_content}

请用中文回答，保持简洁。"""
        }
    ]
)

# 提取回复
review_result = response.choices[0].message.content

# 保存结果到文件
with open("review_result.txt", "w", encoding="utf-8") as f:
    f.write("=== GLM 代码审查结果 ===\n\n")
    f.write(review_result)

print("审查完成！")
print("\n" + review_result)
