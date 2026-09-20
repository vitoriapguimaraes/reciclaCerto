import os
import json
import re
import math
import google.generativeai as genai
from flask import Flask, request, jsonify, render_template
from dotenv import load_dotenv

load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, '..'))

app = Flask(
    __name__,
    static_folder=os.path.join(PROJECT_ROOT, 'static'),
    template_folder=os.path.join(PROJECT_ROOT, 'templates')
)

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

model = None
if GEMINI_API_KEY:
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(
            'models/gemini-2.0-flash',
            generation_config={"response_mime_type": "application/json"}
        )
        print("Google Gemini API configurada com sucesso.")
    except Exception as e:
        print(f"Erro ao inicializar API Gemini: {e}")
        model = None
else:
    print("Aviso: GEMINI_API_KEY não encontrada nas variáveis de ambiente. Defina no arquivo .env para habilitar consultas via IA.")

PONTOS_RECICLAGEM = []
data_file_path = os.path.join(PROJECT_ROOT, 'data', 'pontos_reciclagem_sp.json')

try:
    with open(data_file_path, 'r', encoding='utf-8') as f:
        PONTOS_RECICLAGEM = json.load(f)
    print(f"Sucesso ao carregar {len(PONTOS_RECICLAGEM)} pontos de reciclagem de '{data_file_path}'.")
except FileNotFoundError:
    print(f"Aviso: arquivo '{data_file_path}' não encontrado. A busca por locais de reciclagem funcionará com lista vazia.")
    PONTOS_RECICLAGEM = []
except json.JSONDecodeError:
    print(f"Erro: '{data_file_path}' contém JSON inválido. Verifique a sintaxe do arquivo JSON.")
    PONTOS_RECICLAGEM = []

@app.route('/')
def index() -> str:
    return render_template('index.html')

def normalize_string(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    text = (text.replace("á", "a").replace("ã", "a").replace("â", "a")
                .replace("é", "e").replace("ê", "e").replace("í", "i")
                .replace("ó", "o").replace("ô", "o").replace("õ", "o")
                .replace("ú", "u").replace("ç", "c"))
    text = re.sub(r'[^a-z0-9\s]', '', text)
    return text.strip()

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371
    d_lat = math.radians(lat2 - lat1)
    d_lon = math.radians(lon2 - lon1)
    a = math.sin(d_lat / 2) * math.sin(d_lat / 2) + \
        math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * \
        math.sin(d_lon / 2) * math.sin(d_lon / 2)
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return distance

@app.route('/ask_gemini', methods=['POST'])
def ask_gemini() -> json:
    data = request.json or {}
    item = data.get('item')

    if not item:
        return jsonify({"error": "Por favor, forneça um item para verificar."}), 400

    if not model:
        return jsonify({
            "error": "A chave GEMINI_API_KEY não está configurada no servidor. Por favor, adicione sua GEMINI_API_KEY no arquivo .env para utilizar a verificação inteligente."
        }), 503

    prompt = f"""
    Você é um assistente de reciclagem no Brasil. Sua tarefa é analisar o item fornecido e responder de forma concisa:
    1. Se o item é reciclável ou não no Brasil.
    2. Se reciclável, qual a categoria de material (ex: plástico, papel, metal, vidro, eletrônico, óleo, isopor, orgânico, etc.). Forneça uma categoria genérica e comum no Brasil.
    3. Uma breve instrução de como prepará-lo para reciclagem (ex: lavar e secar, remover rótulos, descartar em ecoponto, etc.). Seja específico.
    4. Se não for reciclável pelo descarte comum, explique por que e sugira o que fazer (lixo comum, programas específicos).
    5. Se for um material muito específico ou que requer descarte especial (ex: medicamentos, lixo hospitalar, pilhas, óleo de cozinha, eletrônicos), adicione a instrução de "Procurar pontos de coleta específicos ou ecopontos".

    Retorne estritamente um JSON com a estrutura:
    {{
      "reciclavel": true/false,
      "material": "categoria do material",
      "instrucao": "instruções de descarte e reciclagem"
    }}

    Para o item: {item}
    """

    try:
        response = model.generate_content(prompt)
        gemini_response_text = ""
        
        if hasattr(response, 'text') and response.text:
            gemini_response_text = response.text
        elif response.candidates and hasattr(response.candidates[0], 'content') and \
             hasattr(response.candidates[0].content, 'parts') and response.candidates[0].content.parts:
            gemini_response_text = response.candidates[0].content.parts[0].text

        gemini_json = None
        try:
            gemini_json = json.loads(gemini_response_text)
        except json.JSONDecodeError:
            json_start = gemini_response_text.find('{')
            json_end = gemini_response_text.rfind('}')
            if json_start != -1 and json_end != -1 and json_end > json_start:
                json_string = gemini_response_text[json_start : json_end + 1]
                try:
                    gemini_json = json.loads(json_string)
                except json.JSONDecodeError:
                    pass

        if not gemini_json:
            print(f"Resposta do Gemini não contém JSON válido: {gemini_response_text}")
            return jsonify({
                "error": "Resposta do Gemini não contém o formato JSON esperado.",
                "raw_gemini_response": gemini_response_text
            }), 500

        material_gemini = gemini_json.get("material", "").lower()
        locais_encontrados = []
        
        if material_gemini:
            for ponto in PONTOS_RECICLAGEM:
                materiais_aceitos_norm = [normalize_string(m) for m in ponto.get('materiais_aceitos', [])]
                if normalize_string(material_gemini) in materiais_aceitos_norm:
                    locais_encontrados.append(ponto)

        resultado = {
            "mensagem1": "",
            "mensagem2": "",
            "mensagem3": "",
            "status": "desconhecido",
            "gemini_raw": gemini_json,
            "locais": locais_encontrados
        }

        if gemini_json.get("reciclavel") is True and locais_encontrados:
            resultado["mensagem1"] = f"Há cooperativas/ecopontos que recolhem {item.lower()}, confira no mapa a opção mais próxima de você."
            resultado["mensagem2"] = "Esse material é reciclável!"
            resultado["mensagem3"] = f"Instruções para reciclar: {gemini_json.get('instrucao', 'N/A')}"
            resultado["status"] = "tem_local"
        elif gemini_json.get("reciclavel") is True and not locais_encontrados:
            resultado["mensagem1"] = f"Esse material é reciclável, mas não temos cooperativas específicas para {item.lower()} cadastradas em nossa base local."
            resultado["mensagem2"] = "Dicas de reciclagem:"
            resultado["mensagem3"] = gemini_json.get('instrucao', 'N/A')
            resultado["status"] = "reciclavel_sem_local"
        elif gemini_json.get("reciclavel") is False:
            resultado["mensagem1"] = f"{item.capitalize()} NÃO é reciclável no descarte comum."
            resultado["mensagem2"] = "Orientação de descarte:"
            resultado["mensagem3"] = gemini_json.get('instrucao', 'N/A')
            resultado["status"] = "nao_reciclavel"
        else:
            resultado["mensagem1"] = f"Não foi possível determinar o status de reciclagem para '{item}'. Tente descrever o item de outra forma."
            resultado["mensagem2"] = "Verifique a informação ou tente outro item."
            resultado["status"] = "desconhecido"

        return jsonify(resultado)

    except Exception as e:
        print(f"Erro inesperado ao processar solicitação '/ask_gemini': {e}", exc_info=True)
        return jsonify({
            "error": f"Ocorreu um erro ao verificar o item com o Gemini. Detalhes: {str(e)}"
        }), 500

@app.route('/find_recycling_points', methods=['POST'])
def find_recycling_points() -> json:
    data = request.json or {}
    material_from_frontend = data.get('material')
    user_latitude = data.get('latitude')
    user_longitude = data.get('longitude')

    if not material_from_frontend or user_latitude is None or user_longitude is None:
        return jsonify({"error": "Material, latitude e longitude são necessários para buscar pontos."}), 400

    pontos_filtrados_e_ordenados = []
    normalized_material_frontend = normalize_string(material_from_frontend)

    for ponto in PONTOS_RECICLAGEM:
        materiais_aceitos_norm = [normalize_string(m) for m in ponto.get('materiais_aceitos', [])]
        if normalized_material_frontend in materiais_aceitos_norm:
            ponto_latitude = ponto.get('latitude')
            ponto_longitude = ponto.get('longitude')
            if ponto_latitude is not None and ponto_longitude is not None:
                distancia_km = calculate_distance(user_latitude, user_longitude, 
                                                  ponto_latitude, ponto_longitude)
                ponto_com_dist = ponto.copy()
                ponto_com_dist['distancia_km'] = round(distancia_km, 2)
                pontos_filtrados_e_ordenados.append(ponto_com_dist)

    pontos_filtrados_e_ordenados.sort(key=lambda p: p.get('distancia_km', float('inf')))

    return jsonify({"pontos": pontos_filtrados_e_ordenados})

if __name__ == '__main__':
    app.run(debug=True)