from flask import Flask, request, jsonify
from openai import OpenAI
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

CORS(app, origins=["http://localhost:3000", "https://openrouter.ai"])

if os.getenv("OPENROUTER_API_KEY") is None:
    print("Please set the OPENROUTER_API_KEY environment variable.")
    exit(1)

client = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=os.getenv("OPENROUTER_API_KEY", ""),
)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.get_json()
    print(data)
    modal = data.get('MODAL')
    content = data.get('content')
    if not modal or not content:
        return jsonify({'error': 'MODEL and content are required'}), 400

    completion = client.chat.completions.create(
        model=modal,
        messages=[
            {
                "role": "user",
                "content": content
            }
        ],
        stream=False,
    )
    response_text = completion.choices[0].message.content
    return jsonify({'response': response_text})

if __name__ == '__main__':
    app.run(debug=True, port=8000)
