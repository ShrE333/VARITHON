import { useState, useRef } from "react";
import "./App.css";

function App() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState("");

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // --------------------------------
  // Text question → text answer
  // --------------------------------
  const askQuestion = async () => {
    if (!question.trim()) return;

    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch(
        `http://127.0.0.1:8000/ask?question=${encodeURIComponent(question)}`
      );

      if (!response.ok) {
        throw new Error("Server error");
      }

      const data = await response.json();

      setAnswer(data.answer);
    } catch (error) {
      console.error(error);

      setAnswer(
        "Sorry, I couldn't connect to VariMitra right now. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------
  // Start voice recording
  // --------------------------------
  const startVoice = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mimeTypes = [
        "audio/ogg;codecs=opus",
        "audio/ogg",
        "audio/webm;codecs=opus",
        "audio/webm",
      ];

      const supportedMimeType = mimeTypes.find((type) =>
        MediaRecorder.isTypeSupported(type)
      );

      const recorder = supportedMimeType
        ? new MediaRecorder(stream, {
            mimeType: supportedMimeType,
          })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());

        const audioBlob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType,
        });

        await sendVoice(audioBlob);
      };

      recorder.start();

      setRecording(true);
      setVoiceStatus("🎙️ Listening...");
    } catch (error) {
      console.error(error);

      setVoiceStatus(
        "Microphone permission was not granted."
      );
    }
  };

  // --------------------------------
  // Stop voice recording
  // --------------------------------
  const stopVoice = () => {
    const recorder = mediaRecorderRef.current;

    if (!recorder) return;

    recorder.stop();

    setRecording(false);
    setVoiceStatus("⏳ Processing your voice...");
  };

  // --------------------------------
  // Send voice → backend
  // --------------------------------
  const sendVoice = async (audioBlob) => {
    const formData = new FormData();

    const extension = audioBlob.type.includes("ogg")
      ? "ogg"
      : "webm";

    formData.append(
      "file",
      audioBlob,
      `voice.${extension}`
    );

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/voice",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Voice request failed: ${response.status}`);
      }

      // Backend returns audio
      const audioBlobResponse = await response.blob();

      // Play returned voice response
      const audioUrl = URL.createObjectURL(audioBlobResponse);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        setVoiceStatus("✅ Voice response complete.");
      };

      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        setVoiceStatus("❌ Could not play the voice response.");
      };

      await audio.play();

      setVoiceStatus("🔊 Playing VariMitra response...");
    } catch (error) {
      console.error("Voice error:", error);

      setVoiceStatus(
        "Sorry, I couldn't process the voice message."
      );
    }
  };

  return (
    <div className="app">
      <div className="container">

        {/* Header */}
        <div className="header">
          <div className="logo">वारी</div>

          <div>
            <h1>VariMitra</h1>
            <p>Wari Heritage Assistant</p>
          </div>
        </div>

        {/* Hero */}
        <div className="hero">
          <h2>Explore the story behind the Wari.</h2>

          <p>
            Ask about its history, saints, traditions,
            Abhangs, sacred places and cultural heritage.
          </p>
        </div>

        {/* Question Card */}
        <div className="chat-card">

          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask your question..."
            rows="4"
          />

          <div className="actions">

            <button
              className="voice-button"
              type="button"
              onClick={
                recording
                  ? stopVoice
                  : startVoice
              }
            >
              {recording
                ? "⏹ Stop & Send"
                : "🎤 Voice Message"}
            </button>

            <button
              className="ask-button"
              type="button"
              onClick={askQuestion}
              disabled={loading}
            >
              {loading
                ? "Thinking..."
                : "Ask →"}
            </button>

          </div>

          {/* Voice status */}
          {voiceStatus && (
            <div className="voice-status">
              {voiceStatus}
            </div>
          )}

        </div>

        {/* Answer */}
        <div className="response-card">

          <span>VariMitra</span>

          <p>
            {answer ||
              "Your text answer will appear here..."}
          </p>

        </div>

        {/* Footer */}
        <div className="footer">
          Preserving Wari heritage through technology
        </div>

      </div>
    </div>
  );
}

export default App;