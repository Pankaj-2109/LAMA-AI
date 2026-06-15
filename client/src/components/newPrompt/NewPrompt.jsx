import { useEffect, useRef, useState } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const NewPrompt = ({ data }) => {
  const { getToken } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const [img, setImg] = useState({
    isLoading: false,
    dbData: {},
    aiData: {},
  });

  const endRef = useRef(null);
  const formRef = useRef(null);
  const queryClient = useQueryClient();



  // Auto-scroll like ChatGPT
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save chat
  const mutation = useMutation({
    mutationFn: async ({ question, answer }) => {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chats/${data._id}`,
        {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            question,
            answer,
            img: img.dbData?.filePath || null,
          }),
        }
      );

      if (!res.ok) throw new Error("Failed to save chat");
      return res.json();
    },

    onSuccess: (newChatData) => {
      queryClient.setQueryData(["chat", data._id], newChatData);
      setMessages([]);
      setImg({ isLoading: false, dbData: {}, aiData: {} });
    },
  });

  const hasTriggeredRef = useRef(null);

  // Consolidated response generator
  const generateResponse = async (text, isAuto = false) => {
    if ((!text?.trim() && !img.dbData?.filePath) || isThinking) return;

    setIsThinking(true);

    if (isAuto) {
      setMessages([{ role: "assistant", content: "" }]);
    } else {
      setMessages((prev) => [
        ...prev,
        { 
          role: "user", 
          content: text, 
          img: img.dbData?.filePath || null 
        },
        { role: "assistant", content: "" },
      ]);
    }

    try {
      const history = data?.history || [];
      const baseHistory = isAuto ? history.slice(0, -1) : history;
      
      const chatHistory = baseHistory.map(({ role, parts }) => ({
        role,
        parts: [{ text: parts?.[0]?.text || "" }],
      }));

      const chat = model.startChat({ history: chatHistory });

      const messageParts = Object.keys(img.aiData || {}).length
        ? (text?.trim() ? [img.aiData, text] : [img.aiData])
        : [text];

      const result = await chat.sendMessageStream(messageParts);

      let fullText = "";

      for await (const chunk of result.stream) {
        fullText += chunk.text();

        setMessages((prev) => [
          ...prev.slice(0, -1),
          { role: "assistant", content: fullText },
        ]);
      }

      mutation.mutate({
        question: isAuto ? null : text,
        answer: fullText,
      });

    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "❌ " + (err.message || "Error") },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  // Auto-respond to the first message if no assistant response exists
  useEffect(() => {
    const history = data?.history || [];
    if (history.length > 0 && history[history.length - 1].role === "user") {
      const triggerKey = `${data._id}_${history.length}`;
      if (hasTriggeredRef.current !== triggerKey) {
        hasTriggeredRef.current = triggerKey;
        const lastMsg = history[history.length - 1];
        generateResponse(lastMsg.parts?.[0]?.text || "", true);
      }
    }
  }, [data]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = inputValue;
    const hasImage = !!img.dbData?.filePath;
    if (!text.trim() && !hasImage) return;
    generateResponse(text);
    setInputValue("");
  };

  return (
    <div className="chatContainer">

      {/* CHAT MESSAGES (CHATGPT STYLE) */}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`message ${msg.role === "user" ? "user" : "ai"}`}
        >
          {msg.role === "user" && msg.img && (
            <IKImage
              urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
              path={msg.img}
              width="240"
              style={{ display: "block", borderRadius: "12px", marginBottom: "8px" }}
            />
          )}
          {msg.role === "assistant" ? (
            msg.content ? (
              <Markdown>{msg.content}</Markdown>
            ) : (
              <span className="thinkingText">Thinking...</span>
            )
          ) : (
            msg.content
          )}
        </div>
      ))}

      <div ref={endRef} />

      {/* INPUT BAR */}
      <form
        className="newForm"
        onSubmit={handleSubmit}
        ref={formRef}
        autoComplete="off"
      >
        {/* IMAGE PREVIEW IN THE CAPSULE */}
        {(img.isLoading || img.dbData?.filePath) && (
          <div className="imagePreviewArea">
            {img.isLoading ? (
              <div className="imagePreviewLoading">
                <span>Uploading...</span>
              </div>
            ) : (
              <div className="imagePreviewWrapper">
                <IKImage
                  urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                  path={img.dbData.filePath}
                  width="60"
                  height="60"
                />
                <button
                  type="button"
                  className="removeImageBtn"
                  onClick={() => setImg({ isLoading: false, dbData: {}, aiData: {} })}
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        )}

        <div className="inputContainer">
          <Upload setImg={setImg} />

          <input
            type="text"
            name="chat_input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isThinking ? "Thinking..." : "Ask me anything..."}
            autoComplete="off"
            disabled={isThinking}
          />

          <button
            type="submit"
            disabled={isThinking || (!inputValue.trim() && !img.dbData?.filePath)}
            className={(inputValue.trim() || img.dbData?.filePath) ? "glow" : ""}
          >
            <img src="/arrow.png" alt="Send" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default NewPrompt;