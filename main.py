import os
import json
import re
import base64
import tempfile

from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from groq import Groq
from sarvamai import SarvamAI
from rag import retrieve_for_wari


# --------------------------------------------------
# Environment
# --------------------------------------------------

load_dotenv()

app = FastAPI(title="VariMitra Wari Heritage")


# --------------------------------------------------
# CORS - React frontend
# --------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --------------------------------------------------
# API clients
# --------------------------------------------------

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

sarvam = SarvamAI(
    api_subscription_key=os.getenv("SARVAM_API_KEY")
)


# --------------------------------------------------
# Load curated heritage knowledge
# --------------------------------------------------

with open(
    "heritage.json",
    "r",
    encoding="utf-8"
) as file:
    heritage_data = json.load(file)


# --------------------------------------------------
# Load offline cache
# --------------------------------------------------

with open(
    "cache.json",
    "r",
    encoding="utf-8"
) as file:
    cache_data = json.load(file)


# --------------------------------------------------
# Text cleaning
# --------------------------------------------------

def clean_text(text):

    text = text.lower().strip()

    text = re.sub(
        r"[^\w\s]",
        " ",
        text,
        flags=re.UNICODE
    )

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# --------------------------------------------------
# Detect language for TEXT input
#
# Supports:
#   en-IN → English
#   mr-IN → Marathi
#   hi-IN → Hindi
#
# Hindi and Marathi both use Devanagari, so we use
# language-specific words instead of very short or
# ambiguous markers.
# --------------------------------------------------

def detect_text_language(text):

    text_lower = text.lower().strip()

    devanagari_count = sum(
        1
        for ch in text_lower
        if "\u0900" <= ch <= "\u097F"
    )

    # No Devanagari → English
    if devanagari_count == 0:
        return "en-IN"

    # ----------------------------------------------
    # Strong Marathi indicators
    # ----------------------------------------------

    marathi_markers = [
        "आहे",
        "आहेत",
        "आहोत",
        "म्हणजे",
        "मध्ये",
        "याबद्दल",
        "बद्दल",
        "सांगा",
        "काय आहे",
        "कसे आहे",
        "कशी आहे",
        "कोण आहेत",
        "कोण होते",
        "कुठे",
        "कुठून",
        "कशासाठी",
        "वारीत",
        "वारीमध्ये",
        "वारकऱ्यांना",
        "वारकऱ्यांचे",
        "वारकऱ्यांचा",
        "यांचे",
        "यांना",
        "होते",
        "होत्या",
        "म्हटले",
        "म्हणतात",
        "परंपरा",
        "महत्त्व",
        "सांस्कृतिक",
        "भक्तिमय",
        "जोडलेले",
        "जोडलेल्या",
        "नेल्या",
        "जातात",
        "मिळते",
        "मिळतात",
        "करतात",
        "देतात",
        "होतो",
        "होते",
        "आणि",
        "तसेच",
        "तिची",
        "तिच्या",
        "त्यामुळे",
        "पिढ्यानपिढ्या"
    ]

    # ----------------------------------------------
    # Strong Hindi indicators
    # ----------------------------------------------

    hindi_markers = [
        "क्या",
        "क्यों",
        "कैसे",
        "कैसी",
        "कौन",
        "कौन हैं",
        "कौन थे",
        "कहाँ",
        "कहां",
        "कहाँ से",
        "कहां से",
        "किसे",
        "किसका",
        "किसकी",
        "किसके",
        "किसलिए",
        "क्योंकि",
        "बताइए",
        "बताएं",
        "बताओ",
        "के बारे में",
        "के बारे",
        "क्या है",
        "क्या हैं",
        "क्या था",
        "क्या थे",
        "महत्वपूर्ण",
        "महत्व",
        "परंपरा",
        "यात्रा",
        "भक्ति",
        "जुड़े",
        "जुड़ी",
        "जुड़ा",
        "जाते हैं",
        "जाती हैं",
        "करते हैं",
        "करता है",
        "होता है",
        "होते हैं",
        "है",
        "हैं",
        "और",
        "यह",
        "इस",
        "उस",
        "उन",
        "क्यों है"
    ]

    marathi_score = 0
    hindi_score = 0

    # ----------------------------------------------
    # Score language markers
    # ----------------------------------------------

    for marker in marathi_markers:

        if marker in text_lower:
            marathi_score += 1

    for marker in hindi_markers:

        if marker in text_lower:
            hindi_score += 1

    # ----------------------------------------------
    # Strong Marathi-specific vocabulary
    # ----------------------------------------------

    strong_marathi_words = [
        "वारीत",
        "वारीमध्ये",
        "वारकऱ्यांना",
        "वारकऱ्यांचे",
        "वारकऱ्यांचा",
        "पंढरपूरला",
        "कुठून",
        "सांगा",
        "नेल्या",
        "जातात",
        "म्हणजे",
        "पिढ्यानपिढ्या",
        "महत्त्वाचे",
        "महत्त्वाचा",
        "महत्त्वाची",
        "जोडलेल्या",
        "भक्तिमय"
    ]

    for word in strong_marathi_words:

        if word in text_lower:
            marathi_score += 2

    # ----------------------------------------------
    # Strong Hindi-specific vocabulary
    # ----------------------------------------------

    strong_hindi_words = [
        "क्या",
        "क्यों",
        "कौन",
        "कहाँ",
        "कहां",
        "कैसे",
        "कैसी",
        "बताइए",
        "बताएं",
        "के बारे में",
        "किसका",
        "किसकी",
        "किसके",
        "होता है",
        "होते हैं",
        "जाते हैं",
        "करते हैं"
    ]

    for word in strong_hindi_words:

        if word in text_lower:
            hindi_score += 2

    # ----------------------------------------------
    # Decide
    # ----------------------------------------------

    if marathi_score > hindi_score:
        return "mr-IN"

    if hindi_score > marathi_score:
        return "hi-IN"

    # ----------------------------------------------
    # Tie-breakers
    # ----------------------------------------------

    if any(
        marker in text_lower
        for marker in [
            "आहे",
            "आहेत",
            "म्हणजे",
            "मध्ये",
            "सांगा",
            "वारीत",
            "वारीमध्ये",
            "यांचे",
            "यांना",
            "पिढ्यानपिढ्या"
        ]
    ):
        return "mr-IN"

    if any(
        marker in text_lower
        for marker in [
            "क्या",
            "क्यों",
            "कैसे",
            "कौन",
            "कहाँ",
            "कहां",
            "बताइए",
            "बताएं",
            "के बारे में",
            "है",
            "हैं"
        ]
    ):
        return "hi-IN"

    # Default for ambiguous Devanagari
    return "hi-IN"


# --------------------------------------------------
# Find answer in cache
#
# Cache should only answer:
#   1. Exact known questions
#   2. Strong, specific topic matches
#
# Broad words such as "route", "community", "history",
# "village", etc. must NOT cause false cache hits.
# --------------------------------------------------

# --------------------------------------------------
# Find answer in cache
#
# Accuracy-first cache matching:
#   1. Exact question → cache
#   2. Strong specific topic keyword → cache
#   3. Otherwise → NOT cached
#
# This prevents unseen questions from being
# incorrectly matched to vaguely related cache items.
# --------------------------------------------------

def find_cached_answer(question):

    question_clean = clean_text(question)
    question_words = set(
        question_clean.split()
    )

    # ----------------------------------------------
    # Generic words that must NEVER independently
    # trigger a cache match
    # ----------------------------------------------

    GENERIC_KEYWORDS = {
        # English
        "wari",
        "vari",
        "pandharpur",
        "heritage",
        "tradition",
        "traditions",
        "history",
        "historical",
        "community",
        "communities",
        "social",
        "culture",
        "cultural",
        "devotion",
        "devotional",
        "pilgrimage",
        "pilgrim",
        "pilgrims",
        "music",
        "song",
        "songs",
        "story",
        "stories",
        "language",
        "languages",
        "ritual",
        "rituals",
        "route",
        "routes",
        "village",
        "villages",
        "rural",
        "local",
        "area",
        "areas",
        "place",
        "places",
        "region",
        "regions",
        "journey",
        "travel",
        "travelling",
        "traveling",
        "experience",
        "people",
        "role",
        "impact",
        "effect",
        "importance",
        "important",
        "meaning",
        "part",
        "during",
        "what",
        "why",
        "how",

        # Marathi
        "वारी",
        "वारि",
        "पंढरपूर",
        "पंढरपुर",
        "परंपरा",
        "इतिहास",
        "वारसा",
        "समुदाय",
        "सामाजिक",
        "सांस्कृतिक",
        "भक्ती",
        "भक्तिमय",
        "यात्रा",
        "तीर्थयात्रा",
        "प्रवास",
        "मार्ग",
        "मार्गावर",
        "मार्गावरील",
        "गाव",
        "गावे",
        "गावांमध्ये",
        "गावांमधील",
        "ग्रामीण",
        "स्थानिक",
        "भाग",
        "महत्त्व",
        "महत्त्वाचे",
        "महत्त्वाचा",
        "महत्त्वाची",
        "अनुभव",
        "भूमिका",
        "परिणाम",
        "प्रभाव",
        "कसे",
        "कशी",
        "काय",
        "का",
        "आहे",
        "आहेत",
        "मध्ये",
        "दरम्यान",

        # Hindi
        "वारि",
        "विरासत",
        "परंपरा",
        "इतिहास",
        "समुदाय",
        "सामाजिक",
        "सांस्कृतिक",
        "भक्ति",
        "यात्रा",
        "तीर्थयात्रा",
        "मार्ग",
        "मार्गों",
        "गाँव",
        "गांव",
        "ग्रामीण",
        "स्थानीय",
        "क्षेत्र",
        "भूमिका",
        "महत्व",
        "महत्वपूर्ण",
        "अनुभव",
        "प्रभाव",
        "असर",
        "दौरान",
        "क्या",
        "क्यों",
        "कैसे",
        "है",
        "हैं",
    }

    # ----------------------------------------------
    # Truly specific cache concepts
    #
    # These are allowed to trigger a cache match.
    # ----------------------------------------------

    SPECIFIC_KEYWORDS = {
        # Wari concepts
        "dindi",
        "दिंडी",

        "palkhi",
        "पालखी",

        "abhang",
        "abhangs",
        "अभंग",

        "paduka",
        "padukas",
        "पादुका",

        "dnyaneshwar",
        "ज्ञानेश्वर",

        "tukaram",
        "तुकाराम",

        "namdev",
        "नामदेव",

        "janabai",
        "जनाबाई",

        "chokhamela",
        "चोखामेळा",

        "soyrabai",
        "सोयराबाई",

        "savata",
        "सावता",

        "gora kumbhar",
        "गोरा कुंभार",

        "narhari sonar",
        "नरहरी सोनार",

        "vitthal",
        "vithoba",
        "विठ्ठल",
        "विठोबा",

        "chandrabhaga",
        "चंद्रभागा",

        "alandi",
        "आळंदी",

        "dehu",
        "देहू",

        "ashadhi",
        "आषाढी",

        "kartiki",
        "कार्तिकी",

        "ekadashi",
        "एकादशी",

        "dnyaneshwari",
        "ज्ञानेश्वरी",

        "kirtan",
        "कीर्तन",

        "bhajan",
        "भजन",

        "pundalik",
        "पुंडलिक",

        "mahadwar",
        "महाद्वार",

        "namdev payari",
        "नामदेव पायरी",

        "wari culture",
        "वारी संस्कृती",

        "living heritage",
        "जिवंत वारसा",

        "digital heritage",
        "डिजिटल वारसा",

        "heritage map",
        "वारसा नकाशा",
    }

    # ----------------------------------------------
    # 1. Exact cached question match
    #
    # This is always accepted.
    # ----------------------------------------------

    for item in cache_data:

        for cached_question in item["questions"]:

            if question_clean == clean_text(
                cached_question
            ):

                return item["answer"]

    # ----------------------------------------------
    # 2. Strong specific-topic match
    #
    # Do NOT use fuzzy question overlap here.
    # ----------------------------------------------

    best_answer = None
    best_score = 0

    for item in cache_data:

        score = 0

        for keyword in item["keywords"]:

            keyword_clean = clean_text(
                keyword
            )

            if not keyword_clean:
                continue

            keyword_words = set(
                keyword_clean.split()
            )

            # --------------------------------------
            # Multi-word keyword
            # --------------------------------------

            if len(keyword_words) >= 2:

                specific_words = (
                    keyword_words
                    & SPECIFIC_KEYWORDS
                )

                # If the phrase contains a genuinely
                # specific concept, require all words.
                if specific_words:

                    if keyword_words.issubset(
                        question_words
                    ):

                        score += (
                            len(specific_words) * 20
                        )

            # --------------------------------------
            # Single-word keyword
            # --------------------------------------

            else:

                if keyword_clean in SPECIFIC_KEYWORDS:

                    if keyword_clean in question_words:

                        score += 20

        if score > best_score:

            best_score = score
            best_answer = item["answer"]

    # ----------------------------------------------
    # Only return if a genuinely specific topic
    # matched.
    # ----------------------------------------------

    if best_score >= 20:

        return best_answer

    return None


# --------------------------------------------------
# Curated translations for important demo topics
#
# These are used first for accuracy.
# If no curated translation matches, the existing
# GROQ translation fallback is used.
# --------------------------------------------------

CURATED_TRANSLATIONS = {

    "dindi": {
        "mr-IN": (
            "दिंडी म्हणजे वारीमध्ये एकत्र सहभागी होणारा "
            "वारकऱ्यांचा संघटित समूह. दिंडीच्या माध्यमातून "
            "वारीच्या प्रवासाला शिस्त आणि रचना मिळते आणि "
            "सामूहिक भक्ती, शिस्त व दैनंदिन उपक्रम पाळले जातात. "
            "वारीच्या सामूहिक स्वरूपात दिंडीला महत्त्वाचे स्थान आहे."
        ),

        "hi-IN": (
            "दिंडी वारी में एक साथ भाग लेने वाले वारकरियों का "
            "एक संगठित समूह है। दिंडी के माध्यम से यात्रा में "
            "व्यवस्था और अनुशासन बना रहता है तथा सामूहिक भक्ति "
            "और दैनिक गतिविधियाँ निभाई जाती हैं। वारी के सामूहिक "
            "स्वरूप में दिंडी का महत्वपूर्ण स्थान है।"
        )
    },

    "palkhi": {
        "mr-IN": (
            "पालखी परंपरा ही वारीचा एक महत्त्वाचा भाग आहे. "
            "या परंपरेत संतांशी संबंधित पादुका सन्मानपूर्वक "
            "मिरवणुकीत पंढरपूरकडे नेल्या जातात. त्यामुळे आजची "
            "वारी आणि संत परंपरा यांच्यातील सांस्कृतिक व "
            "भक्तिमय संबंध जिवंत राहतो."
        ),

        "hi-IN": (
            "पालखी परंपरा वारी का एक महत्वपूर्ण हिस्सा है। "
            "इस परंपरा में संतों से संबंधित पादुकाओं को "
            "सम्मानपूर्वक शोभायात्रा में पंढरपुर ले जाया जाता है। "
            "इससे वर्तमान वारी और संत परंपरा के बीच सांस्कृतिक "
            "और भक्तिमय संबंध जीवंत रहता है।"
        )
    },

    "abhang": {
        "mr-IN": (
            "अभंग हे महाराष्ट्रातील वारकरी परंपरेशी घट्टपणे "
            "जोडलेल्या भक्तिमय रचना आहेत. ते भक्ती, आध्यात्मिक "
            "चिंतन, नैतिक विचार आणि संतांच्या शिकवणी व्यक्त करतात. "
            "वारीदरम्यान अभंग सामूहिक गायन आणि भक्तिमय आचरणातून "
            "अनुभवले जातात."
        ),

        "hi-IN": (
            "अभंग महाराष्ट्र की वारकरी परंपरा से गहराई से जुड़े "
            "भक्तिमय रचनाएँ हैं। वे भक्ति, आध्यात्मिक चिंतन, "
            "नैतिक विचार और संतों की शिक्षाओं को व्यक्त करते हैं। "
            "वारी के दौरान अभंगों का अनुभव सामूहिक गायन और "
            "भक्तिमय आचरण के माध्यम से किया जाता है।"
        )
    },

    "wari": {
        "mr-IN": (
            "वारी महत्त्वाची आहे कारण ती भक्ती, समुदाय आणि "
            "सांस्कृतिक परंपरा एका सामायिक प्रवासात एकत्र आणते. "
            "ती विठ्ठलाशी संबंधित भक्तीपर वारसा आणि संत परंपरा "
            "जिवंत ठेवते, तसेच पिढ्यानपिढ्या लोकांना जोडते. "
            "तिची गीते, मिरवणुका आणि सामूहिक प्रथा महाराष्ट्राच्या "
            "जिवंत वारशाचा महत्त्वपूर्ण भाग बनवतात."
        ),

        "hi-IN": (
            "वारी महत्वपूर्ण है क्योंकि यह भक्ति, समुदाय और "
            "सांस्कृतिक परंपरा को एक साझा यात्रा में जोड़ती है। "
            "यह विठ्ठल से जुड़े भक्तिमय विरासत और संत परंपरा को "
            "जीवित रखती है तथा पीढ़ियों को जोड़ती है। इसके गीत, "
            "मिरवणूक और सामूहिक प्रथाएँ महाराष्ट्र की जीवंत "
            "सांस्कृतिक विरासत का महत्वपूर्ण हिस्सा हैं।"
        )
    },

    "warkari": {
        "mr-IN": (
            "वारकरी हे विठ्ठल आणि पंढरपूरशी भक्तीपूर्ण संबंध "
            "असलेल्या वारकरी परंपरेशी जोडलेले भक्त आहेत. "
            "ते वारी, भजन, प्रार्थना आणि इतर सामूहिक भक्तीपर "
            "आचरणात सहभागी होतात. वारकरी परंपरा ही महाराष्ट्राच्या "
            "सांस्कृतिक वारशाचा महत्त्वाचा भाग आहे."
        ),

        "hi-IN": (
            "वारकरी वे भक्त हैं जो विठ्ठल और पंढरपुर से जुड़े "
            "वारकरी संप्रदाय से संबंधित हैं। वे वारी, भजन, "
            "प्रार्थना और अन्य सामूहिक भक्तिमय गतिविधियों में "
            "भाग लेते हैं। वारकरी परंपरा महाराष्ट्र की सांस्कृतिक "
            "विरासत का महत्वपूर्ण हिस्सा है।"
        )
    }
}


# --------------------------------------------------
# Translate cached answer
# --------------------------------------------------

def translate_answer(
    answer,
    language_code
):

    if language_code == "en-IN":
        return answer

    answer_lower = answer.lower()

    topic_key = None

    if "dindi" in answer_lower:
        topic_key = "dindi"

    elif "palkhi" in answer_lower:
        topic_key = "palkhi"

    elif "abhang" in answer_lower:
        topic_key = "abhang"

    elif "warkari" in answer_lower:
        topic_key = "warkari"

    elif "wari" in answer_lower:
        topic_key = "wari"

    # ----------------------------------------------
    # Curated translation first
    # ----------------------------------------------

    if (
        topic_key
        and topic_key in CURATED_TRANSLATIONS
        and language_code
        in CURATED_TRANSLATIONS[topic_key]
    ):

        return CURATED_TRANSLATIONS[
            topic_key
        ][language_code]

    # ----------------------------------------------
    # GROQ fallback translation
    # ----------------------------------------------

    if language_code == "mr-IN":

        target_language = "natural Marathi"

    elif language_code == "hi-IN":

        target_language = "natural Hindi"

    else:

        target_language = "natural English"

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    f"Translate the following Wari heritage answer "
                    f"into {target_language}. "
                    "Preserve the meaning exactly. "
                    "Do not add historical facts. "
                    "Do not remove important information. "
                    "Use natural, grammatically correct language. "
                    "Do not introduce unrelated words or concepts."
                )
            },
            {
                "role": "user",
                "content": answer
            }
        ]
    )

    return response.choices[0].message.content


# --------------------------------------------------
# Generate answer for unseen Wari-related questions
#
# Cache is handled before this function.
#
# Unseen Wari questions:
#   Wari-domain check
#   → RAG context when strongly relevant
#   → GROQ
# --------------------------------------------------

def generate_ai_answer(question):

    # ----------------------------------------------
    # 1. Confirm Wari domain
    # ----------------------------------------------

    rag_result = retrieve_for_wari(
        question
    )

    if not rag_result["allowed"]:

        return (
            "I can only answer questions related to "
            "the Wari, Warkari tradition, Pandharpur, "
            "and associated Wari heritage."
        )

    # ----------------------------------------------
    # 2. Build RAG context only for strong matches
    # ----------------------------------------------

    retrieved_context_parts = []

    for item in rag_result["results"]:

        score = item.get(
            "score",
            0
        )

        # Only pass strongly relevant context
        # to GROQ.
        if score >= 50:

            retrieved_context_parts.append(
                "TOPIC:\n"
                + item["question"]
                + "\n\n"
                + "ANSWER:\n"
                + item["answer"]
            )

    if retrieved_context_parts:

        retrieved_context = (
            "\n\n---\n\n".join(
                retrieved_context_parts
            )
        )

    else:

        retrieved_context = (
            "No directly relevant local heritage "
            "context was retrieved for this question."
        )

    # ----------------------------------------------
    # 3. GROQ
    # ----------------------------------------------

    response = client.chat.completions.create(
        model="openai/gpt-oss-20b",
        messages=[
            {
                "role": "system",
                "content": (
                    "You are VariMitra, a Wari Heritage Assistant.\n\n"

                    "Only answer questions that are related to the "
                    "Pandharpur Wari, Warkari tradition, Pandharpur, "
                    "Vitthal, Palkhi, Dindi, Abhangs, saints, pilgrimage, "
                    "or closely related Wari culture and heritage.\n\n"

                    "The user question has already passed the "
                    "Wari-domain check.\n\n"

                    "Answer the user's actual question directly. "
                    "Do not replace the question with a generic "
                    "description of the Wari.\n\n"

                    "The retrieved heritage context below is "
                    "supporting information. Use it when it is "
                    "relevant to the question, but do not simply "
                    "summarize it if it does not answer the user's "
                    "question.\n\n"

                    "If the retrieved context is incomplete or "
                    "does not contain the answer, use your general "
                    "knowledge to answer the Wari-related question.\n\n"

                    "When answering unseen Wari-related questions, "
                    "give a useful general answer, but distinguish "
                    "broad observations from verified Wari-specific "
                    "facts.\n\n"

                    "Do not introduce specific events, institutions, "
                    "statistics, locations, practices, economic figures, "
                    "or historical claims unless you are reasonably "
                    "confident they are accurate.\n\n"

                    "Avoid adding details merely to make the answer "
                    "sound more specific or impressive.\n\n"

                    "Do not refuse a Wari-related question merely "
                    "because the exact topic is not present in the "
                    "retrieved context.\n\n"

                    "Reply in the same language as the user's question.\n\n"

                    "Keep the response concise, clear, and "
                    "conversational. Prefer 2-4 sentences.\n\n"

                    "Do not use a table unless the user explicitly "
                    "asks for a table.\n\n"

                    "RELEVANT LOCAL WARI HERITAGE CONTEXT:\n"
                    + retrieved_context
                )
            },
            {
                "role": "user",
                "content": question
            }
        ]
    )

    return response.choices[0].message.content


# --------------------------------------------------
# Home
# --------------------------------------------------

@app.get("/")
def home():

    return {
        "message": (
            "VariMitra Heritage Assistant is running"
        )
    }


# --------------------------------------------------
# ASK
#
# 1. Known cached question → cache
# 2. Otherwise check Wari domain
# 3. Wari → RAG + GROQ
# 4. Non-Wari → reject
# --------------------------------------------------

@app.get("/ask")
def ask(question: str):

    # ----------------------------------------------
    # 1. Check cache FIRST
    # ----------------------------------------------

    cached_answer = find_cached_answer(
        question
    )

    if cached_answer:

        language_code = detect_text_language(
            question
        )

        if language_code == "en-IN":

            final_answer = cached_answer
            source = "offline_cache"

        else:

            try:

                final_answer = translate_answer(
                    cached_answer,
                    language_code
                )

                source = "offline_cache_translated"

            except Exception as e:

                print(
                    "Translation unavailable:",
                    e
                )

                final_answer = cached_answer
                source = "offline_cache"

        return {
            "question": question,
            "answer": final_answer,
            "source": source,
            "language_code": language_code
        }

    # ----------------------------------------------
    # 2. Not cached → Wari-domain check
    # ----------------------------------------------

    rag_result = retrieve_for_wari(
        question
    )

    if not rag_result["allowed"]:

        return {
            "question": question,
            "answer": (
                "I can only answer questions related "
                "to the Wari, Warkari tradition, "
                "Pandharpur, and associated Wari heritage."
            ),
            "source": "domain_rejected",
            "language_code": detect_text_language(
                question
            )
        }

    # ----------------------------------------------
    # 3. Wari question → RAG + GROQ
    # ----------------------------------------------

    try:

        answer = generate_ai_answer(
            question
        )

        language_code = detect_text_language(
            question
        )

        return {
            "question": question,
            "answer": answer,
            "source": "rag_groq",
            "language_code": language_code
        }

    except Exception as e:

        print(
            "GROQ unavailable:",
            e
        )

        return {
            "question": question,
            "answer": (
                "I’m currently offline and I don't "
                "have this information in my local "
                "heritage cache."
            ),
            "source": "offline",
            "language_code": detect_text_language(
                question
            )
        }


# --------------------------------------------------
# SPEAK
#
# Text → Audio
# --------------------------------------------------

@app.get("/speak")
def speak(
    text: str,
    language_code: str = "en-IN"
):

    audio = sarvam.text_to_speech.convert(
        text=text,
        model="bulbul:v3",
        language_code=language_code,
        speaker="ratan"
    )

    audio_bytes = base64.b64decode(
        audio.audios[0]
    )

    return Response(
        content=audio_bytes,
        media_type="audio/wav"
    )


# --------------------------------------------------
# VOICE
#
# Audio → STT → Cache → RAG/GROQ → TTS → Audio
# --------------------------------------------------

@app.post("/voice")
async def voice(
    file: UploadFile = File(...)
):

    audio_bytes = await file.read()

    suffix = os.path.splitext(
        file.filename or ".audio"
    )[1]

    if not suffix:

        suffix = ".audio"

    temp_path = None

    try:

        # ------------------------------------------
        # 1. Save uploaded audio
        # ------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:

            temp.write(audio_bytes)
            temp_path = temp.name

        # ------------------------------------------
        # 2. Speech → Text
        # ------------------------------------------

        with open(
            temp_path,
            "rb"
        ) as audio_file:

            stt_response = (
                sarvam.speech_to_text.transcribe(
                    file=audio_file,
                    model="saaras:v3",
                    language_code="unknown"
                )
            )

        transcript = stt_response.transcript

        language_code = (
            stt_response.language_code
            or "en-IN"
        )

        print(
            "VOICE TRANSCRIPT:",
            transcript
        )

        print(
            "VOICE LANGUAGE:",
            language_code
        )

        # ------------------------------------------
        # 3. Check known cache FIRST
        # ------------------------------------------

        cached_answer = find_cached_answer(
            transcript
        )

        if cached_answer:

            if language_code == "en-IN":

                answer = cached_answer
                source = "offline_cache"

            else:

                try:

                    answer = translate_answer(
                        cached_answer,
                        language_code
                    )

                    source = (
                        "offline_cache_translated"
                    )

                except Exception as e:

                    print(
                        "Translation unavailable:",
                        e
                    )

                    answer = cached_answer
                    source = "offline_cache"

        else:

            # --------------------------------------
            # 4. Not cached → Wari domain check
            # --------------------------------------

            rag_result = retrieve_for_wari(
                transcript
            )

            if not rag_result["allowed"]:

                answer = (
                    "I can only answer questions "
                    "related to the Wari, Warkari "
                    "tradition, Pandharpur, and "
                    "associated Wari heritage."
                )

                source = "domain_rejected"

            else:

                # ----------------------------------
                # 5. Unknown Wari → GROQ
                # ----------------------------------

                try:

                    answer = generate_ai_answer(
                        transcript
                    )

                    source = "rag_groq"

                except Exception as e:

                    print(
                        "GROQ unavailable:",
                        e
                    )

                    answer = (
                        "I’m currently offline and "
                        "I don't have this information "
                        "in my local heritage cache."
                    )

                    source = "offline"

        # ------------------------------------------
        # 6. Text → Speech
        # ------------------------------------------

        audio = sarvam.text_to_speech.convert(
            text=answer,
            model="bulbul:v3",
            language_code=language_code,
            speaker="ratan"
        )

        audio_output = base64.b64decode(
            audio.audios[0]
        )

        # ------------------------------------------
        # 7. Return audio
        # ------------------------------------------

        return Response(
            content=audio_output,
            media_type="audio/wav"
        )

    finally:

        # ------------------------------------------
        # Windows-safe cleanup
        # ------------------------------------------

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except PermissionError:

                pass


# --------------------------------------------------
# VOICE TEST
#
# Returns transcript + answer + audio base64
# --------------------------------------------------

@app.post("/voice-test")
async def voice_test(
    file: UploadFile = File(...)
):

    audio_bytes = await file.read()

    suffix = os.path.splitext(
        file.filename or ".audio"
    )[1]

    if not suffix:

        suffix = ".audio"

    temp_path = None

    try:

        # ------------------------------------------
        # Save audio
        # ------------------------------------------

        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix
        ) as temp:

            temp.write(audio_bytes)
            temp_path = temp.name

        # ------------------------------------------
        # STT
        # ------------------------------------------

        with open(
            temp_path,
            "rb"
        ) as audio_file:

            stt_response = (
                sarvam.speech_to_text.transcribe(
                    file=audio_file,
                    model="saaras:v3",
                    language_code="unknown"
                )
            )

        transcript = stt_response.transcript

        language_code = (
            stt_response.language_code
            or "en-IN"
        )

        print(
            "VOICE TEST TRANSCRIPT:",
            transcript
        )

        print(
            "VOICE TEST LANGUAGE:",
            language_code
        )

        # ------------------------------------------
        # Cache first
        # ------------------------------------------

        cached_answer = find_cached_answer(
            transcript
        )

        if cached_answer:

            if language_code == "en-IN":

                answer = cached_answer
                source = "offline_cache"

            else:

                try:

                    answer = translate_answer(
                        cached_answer,
                        language_code
                    )

                    source = (
                        "offline_cache_translated"
                    )

                except Exception as e:

                    print(
                        "Translation unavailable:",
                        e
                    )

                    answer = cached_answer
                    source = "offline_cache"

        else:

            # --------------------------------------
            # Wari domain check
            # --------------------------------------

            rag_result = retrieve_for_wari(
                transcript
            )

            if not rag_result["allowed"]:

                answer = (
                    "I can only answer questions "
                    "related to the Wari, Warkari "
                    "tradition, Pandharpur, and "
                    "associated Wari heritage."
                )

                source = "domain_rejected"

            else:

                # ----------------------------------
                # GROQ
                # ----------------------------------

                try:

                    answer = generate_ai_answer(
                        transcript
                    )

                    source = "rag_groq"

                except Exception as e:

                    print(
                        "GROQ unavailable:",
                        e
                    )

                    answer = (
                        "I’m currently offline and "
                        "I don't have this information "
                        "in my local heritage cache."
                    )

                    source = "offline"

        # ------------------------------------------
        # TTS
        # ------------------------------------------

        audio = sarvam.text_to_speech.convert(
            text=answer,
            model="bulbul:v3",
            language_code=language_code,
            speaker="ratan"
        )

        return {
            "transcript": transcript,
            "answer": answer,
            "source": source,
            "language_code": language_code,
            "audio_base64": audio.audios[0]
        }

    finally:

        if (
            temp_path
            and os.path.exists(temp_path)
        ):

            try:

                os.remove(temp_path)

            except PermissionError:

                pass