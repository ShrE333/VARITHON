import json
import re
import math


# --------------------------------------------------
# Load curated Wari knowledge
# --------------------------------------------------

with open(
    "heritage.json",
    "r",
    encoding="utf-8"
) as file:
    heritage_data = json.load(file)

TOPICS = heritage_data.get("topics", [])


# --------------------------------------------------
# Explicit Wari / Vari domain terms
# --------------------------------------------------

WARI_TERMS = {
    # English
    "wari",
    "vari",
    "warkari",
    "warkaris",
    "pandharpur",
    "palkhi",
    "dindi",
    "abhang",
    "abhangs",
    "vitthal",
    "vithoba",
    "dnyaneshwar",
    "tukaram",
    "chandrabhaga",
    "paduka",
    "padukas",
    "warkari tradition",
    "wari tradition",
    "wari heritage",
    "pandharpur wari",
    "wari pilgrimage",

    # Marathi
    "वारी",
    "वारकरी",
    "वारकऱ्यांचा",
    "वारकऱ्यांचे",
    "पंढरपूर",
    "पंढरपुर",
    "पालखी",
    "दिंडी",
    "अभंग",
    "अभंगांचा",
    "अभंगांचे",
    "विठ्ठल",
    "विठोबा",
    "ज्ञानेश्वर",
    "तुकाराम",
    "चंद्रभागा",
    "पादुका",

    # Hindi
    "वारकरी",
    "वारी",
    "पंढरपुर",
    "पालखी",
    "दिंडी",
    "अभंग",
    "विठ्ठल",
    "विठोबा",
    "ज्ञानेश्वर",
    "तुकाराम",
}


# --------------------------------------------------
# Related concepts
#
# These are only allowed to help when there is
# additional Wari context. They are NOT sufficient
# by themselves to classify every question as Wari.
# --------------------------------------------------

RELATED_TERMS = {
    # English
    "palkhi procession",
    "wari procession",
    "wari route",
    "wari pilgrimage route",
    "warkari pilgrimage",
    "warkari community",
    "wari community",
    "wari devotees",
    "wari pilgrims",
    "warkari devotees",
    "vitthal temple",
    "pandharpur temple",
    "saint tradition",
    "wari saints",
    "wari music",
    "wari songs",
    "wari devotion",
    "wari culture",
    "wari cultural heritage",
    "wari traditions",
    "wari festival",

    # Marathi
    "वारीची परंपरा",
    "वारीचा मार्ग",
    "वारीतील",
    "वारीमध्ये",
    "वारीचे",
    "वारीच्या",
    "वारकरी परंपरा",
    "वारकरी समाज",
    "पालखी सोहळा",
    "वारीचा सोहळा",
    "पंढरपूर मंदिर",
}


# --------------------------------------------------
# Stop words
# --------------------------------------------------

STOP_WORDS = {
    # English
    "what",
    "is",
    "are",
    "the",
    "a",
    "an",
    "of",
    "to",
    "in",
    "on",
    "for",
    "and",
    "or",
    "how",
    "why",
    "who",
    "where",
    "when",
    "tell",
    "me",
    "about",
    "does",
    "do",
    "can",
    "you",
    "please",

    # Marathi
    "काय",
    "आहे",
    "आहेत",
    "मध्ये",
    "बद्दल",
    "का",
    "कसे",
    "कशी",
    "कोण",
    "कधी",
    "कुठे",
    "मला",
    "सांगा",

    # Hindi
    "क्या",
    "है",
    "हैं",
    "में",
    "के",
    "बताइए",
}


# --------------------------------------------------
# Normalize text
# --------------------------------------------------

def normalize(text):

    text = text.lower().strip()

    text = re.sub(
        r"\s+",
        " ",
        text
    )

    return text


# --------------------------------------------------
# Tokenize
# --------------------------------------------------

def tokenize(text):

    text = normalize(text)

    text = re.sub(
        r"[^\w\s]",
        " ",
        text,
        flags=re.UNICODE
    )

    words = text.split()

    return {
        word
        for word in words
        if word not in STOP_WORDS
    }


# --------------------------------------------------
# Build searchable documents
# --------------------------------------------------

DOCUMENTS = []

for topic in TOPICS:

    question = topic.get(
        "question",
        ""
    )

    answer = topic.get(
        "answer",
        ""
    )

    combined_text = (
        question
        + " "
        + answer
    )

    DOCUMENTS.append(
        {
            "question": question,
            "answer": answer,
            "tokens": tokenize(combined_text),
        }
    )


# --------------------------------------------------
# IDF calculation
# --------------------------------------------------

def calculate_idf():

    total_documents = len(DOCUMENTS)

    if total_documents == 0:
        return {}

    document_frequency = {}

    for document in DOCUMENTS:

        for token in document["tokens"]:

            document_frequency[token] = (
                document_frequency.get(
                    token,
                    0
                ) + 1
            )

    idf = {}

    for token, frequency in document_frequency.items():

        idf[token] = (
            math.log(
                (1 + total_documents)
                / (1 + frequency)
            )
            + 1
        )

    return idf


IDF = calculate_idf()


# --------------------------------------------------
# Check explicit Wari term
# --------------------------------------------------

def contains_wari_term(question):

    query = normalize(question)

    for term in WARI_TERMS:

        normalized_term = normalize(term)

        if normalized_term in query:
            return True

    return False


# --------------------------------------------------
# Check strongly Wari-specific phrase
# --------------------------------------------------

def contains_related_term(question):

    query = normalize(question)

    for term in RELATED_TERMS:

        normalized_term = normalize(term)

        if normalized_term in query:
            return True

    return False


# --------------------------------------------------
# Broad Wari context detection
#
# This handles questions where "Wari" is explicit,
# even if the actual subject isn't in heritage.json.
# --------------------------------------------------

def is_wari_related(question):

    query = normalize(question)

    # ----------------------------------------------
    # Strongest signal:
    # explicit Wari/Vari/Warkari terminology
    # ----------------------------------------------

    if contains_wari_term(query):
        return True

    # ----------------------------------------------
    # Strong Wari-specific phrase
    # ----------------------------------------------

    if contains_related_term(query):
        return True

    # ----------------------------------------------
    # Semantic-ish similarity to local knowledge
    #
    # This is only a fallback signal.
    # ----------------------------------------------

    query_tokens = tokenize(query)

    if not query_tokens:
        return False

    best_score = 0.0

    for document in DOCUMENTS:

        overlap = (
            query_tokens
            .intersection(
                document["tokens"]
            )
        )

        if not overlap:
            continue

        score = sum(
            IDF.get(
                token,
                1.0
            )
            for token in overlap
        )

        best_score = max(
            best_score,
            score
        )

    return best_score >= 1.5


# --------------------------------------------------
# Topic-specific detection
#
# This makes retrieval prefer the exact concept
# being asked about.
# --------------------------------------------------

TOPIC_CONCEPTS = {

    "dindi": {
        "dindi",
        "दिंडी",
    },

    "palkhi": {
        "palkhi",
        "palkhi tradition",
        "palkhi procession",
        "पालखी",
        "पालखी परंपरा",
        "पालखी सोहळा",
    },

    "abhang": {
        "abhang",
        "abhangs",
        "अभंग",
        "अभंगांचा",
        "अभंगांचे",
    },

    "pandharpur": {
        "pandharpur",
        "pandharpur wari",
        "पंढरपूर",
        "पंढरपुर",
    },

    "chandrabhaga": {
        "chandrabhaga",
        "chandrabhaga river",
        "चंद्रभागा",
    },

    "saints": {
        "dnyaneshwar",
        "tukaram",
        "dnyaneshwar and tukaram",
        "ज्ञानेश्वर",
        "तुकाराम",
    },
}


# --------------------------------------------------
# Score exact topic concept
# --------------------------------------------------

def topic_match_score(
    question,
    document_question
):

    query = normalize(question)
    topic = normalize(document_question)

    boost = 0.0

    # ----------------------------------------------
    # Dindi
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["dindi"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["dindi"]
        ):

            boost += 200.0

    # ----------------------------------------------
    # Palkhi
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["palkhi"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["palkhi"]
        ):

            boost += 200.0

    # ----------------------------------------------
    # Abhang
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["abhang"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["abhang"]
        ):

            boost += 200.0

    # ----------------------------------------------
    # Pandharpur
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["pandharpur"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["pandharpur"]
        ):

            boost += 200.0

    # ----------------------------------------------
    # Chandrabhaga
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["chandrabhaga"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["chandrabhaga"]
        ):

            boost += 200.0

    # ----------------------------------------------
    # Saints
    # ----------------------------------------------

    if any(
        normalize(term) in query
        for term in TOPIC_CONCEPTS["saints"]
    ):

        if any(
            normalize(term) in topic
            for term in TOPIC_CONCEPTS["saints"]
        ):

            boost += 200.0

    return boost


# --------------------------------------------------
# Retrieve relevant heritage context
# --------------------------------------------------

def retrieve_wari_context(
    question,
    top_k=2
):

    query = normalize(question)
    query_tokens = tokenize(question)

    if not query_tokens:
        return []

    scored_documents = []

    for document in DOCUMENTS:

        score = 0.0

        # ------------------------------------------
        # Exact question match
        # ------------------------------------------

        if query == normalize(
            document["question"]
        ):
            score += 1000.0

        # ------------------------------------------
        # Token overlap
        # ------------------------------------------

        overlap = (
            query_tokens.intersection(
                document["tokens"]
            )
        )

        if overlap:

            score += sum(
                IDF.get(
                    token,
                    1.0
                )
                for token in overlap
            )

        # ------------------------------------------
        # Question overlap
        # ------------------------------------------

        document_question_tokens = tokenize(
            document["question"]
        )

        question_overlap = (
            query_tokens.intersection(
                document_question_tokens
            )
        )

        score += (
            len(question_overlap) * 10.0
        )

        # ------------------------------------------
        # Exact concept boost
        # ------------------------------------------

        score += topic_match_score(
            question,
            document["question"]
        )

        if score > 0:

            scored_documents.append(
                (
                    score,
                    document
                )
            )

    # ----------------------------------------------
    # Sort by strongest match
    # ----------------------------------------------

    scored_documents.sort(
        key=lambda item: item[0],
        reverse=True
    )

    # ----------------------------------------------
    # Only return genuinely useful retrievals
    #
    # Weak matches should NOT be forced into GROQ.
    # ----------------------------------------------

    if not scored_documents:
        return []

    best_score = scored_documents[0][0]

    # Conservative threshold
    if best_score < 15:
        return []

    results = []

    for score, document in scored_documents[:top_k]:

        # Only include reasonably close results
        if score < best_score * 0.40:
            continue

        results.append(
            {
                "question": document["question"],
                "answer": document["answer"],
                "score": score
            }
        )

    return results
# --------------------------------------------------
# Public RAG function
#
# IMPORTANT:
# A question can be Wari-related even when there
# is no matching topic in heritage.json.
# --------------------------------------------------

def retrieve_for_wari(question):

    allowed = is_wari_related(
        question
    )

    if not allowed:

        return {
            "allowed": False,
            "results": []
        }

    results = retrieve_wari_context(
        question,
        top_k=2
    )

    return {
        "allowed": True,
        "results": results
    }