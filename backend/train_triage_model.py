import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

# Representative emergency training corpus
TRAINING_DATA = [
    # Critical / High Severity
    ("People trapped under collapsed building rubble after tremor", "CRITICAL"),
    ("Severe flash flood water rising above first floor need boat rescue", "CRITICAL"),
    ("Massive gas leak and active pipeline explosion near hospital", "CRITICAL"),
    ("Dam breach reported upstream water flooding residential sectors rapidly", "CRITICAL"),
    ("Major fire engulfing chemical warehouse with toxic smoke", "CRITICAL"),
    ("Transformer burst with high tension wire snapped in crowded market", "HIGH"),
    ("Submerged underpass with three cars stuck under water", "HIGH"),
    ("Dense smog and fire spreading towards timber market", "HIGH"),
    ("Tree uprooted on main arterial road blocking emergency ambulances", "HIGH"),
    
    # Medium / Low Severity
    ("Waterlogging on side street knee deep after heavy rain", "MEDIUM"),
    ("Small kitchen cylinder fire quickly contained by neighbors", "MEDIUM"),
    ("Street light pole tilted and sparked once during rain", "LOW"),
    ("Minor roof leakage and water collection in basement", "LOW"),
    ("Slight earth vibration felt no structural cracks visible", "LOW"),
    ("Pothole filled with rainwater slowing down traffic", "LOW"),
]

texts, labels = zip(*TRAINING_DATA)

pipeline = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), stop_words="english")),
    ("classifier", LogisticRegression(class_weight="balanced"))
])

pipeline.fit(texts, labels)

# Save serialized pipeline
joblib.dump(pipeline, "app/triage_model.joblib")
print("Triage classification model trained and saved to app/triage_model.joblib")