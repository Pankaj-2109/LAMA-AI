import { useEffect, useRef, useState, useMemo } from "react";
import "./newPrompt.css";
import Upload from "../upload/Upload";
import { IKImage } from "imagekitio-react";
import model from "../../lib/gemini";
import Markdown from "react-markdown";
import { useMutation, useQueryClient } from "@tanstack/react-query";

const NewPrompt = ({ data }) => {
  const [messages, setMessages] = useState([]);
  const [isThinking, setIsThinking] = useState(false);

  const [img, setImg] = useState({
    isLoading: false,
    dbData: {},
    aiData: {},
  });

  const endRef = useRef(null);
  const formRef = useRef(null);
  const queryClient = useQueryClient();

  // Stable chat history
  const chatHistory = useMemo(() => {
    return (
      data?.history?.map(({ role, parts }) => ({
        role,
        parts: [{ text: parts?.[0]?.text || "" }],
      })) || []
    );
  }, [data?.history]);

  // Stable Gemini session
  const chat = useMemo(() => {
    return model.startChat({
      history: chatHistory,
    });
  }, [chatHistory]);

  // Auto-scroll like ChatGPT
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save chat
  const mutation = useMutation({
    mutationFn: async ({ question, answer }) => {
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/chats/${data._id}`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
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

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chat", data._id] });
      setMessages([]);
      setImg({ isLoading: false, dbData: {}, aiData: {} });
    },
  });

  // 🚀 CHATGPT-STYLE ADD FUNCTION
  const add = async (text) => {
    if (!text.trim() || isThinking) return;

    const userMessage = text;

    setIsThinking(true);

    // Add user + empty assistant message
    const updated = [
      ...messages,
      { role: "user", content: userMessage },
      { role: "assistant", content: "" },
    ];

    setMessages(updated);

    try {
      const result = await chat.sendMessageStream(
        Object.keys(img.aiData || {}).length
          ? [img.aiData, userMessage]
          : [userMessage]
      );

      let fullText = "";

      for await (const chunk of result.stream) {
        fullText += chunk.text();

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = {
            role: "assistant",
            content: fullText,
          };
          return copy;
        });
      }

      mutation.mutate({
        question: userMessage,
        answer: fullText,
      });

    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = {
          role: "assistant",
          content: "❌ " + (err.message || "Error"),
        };
        return copy;
      });
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const text = e.target.chat_input.value;
    if (!text.trim()) return;

    add(text);
    formRef.current?.reset();
  };

  return (
    <div className="chatContainer">

      {/* IMAGE PREVIEW */}
      {img.isLoading && (
        <div className="message ai">Uploading image...</div>
      )}

      {img.dbData?.filePath && (
        <IKImage
          urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
          path={img.dbData.filePath}
          width="320"
        />
      )}

      {/* CHAT MESSAGES (CHATGPT STYLE) */}
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`message ${msg.role === "user" ? "user" : "ai"}`}
        >
          {msg.role === "assistant" ? (
            <Markdown>{msg.content}</Markdown>
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
        <input type="text" name="fake1" style={{ display: "none" }} />
        <input type="password" name="fake2" style={{ display: "none" }} />

        <Upload setImg={setImg} />

        <input
          type="text"
          name="chat_input"
          placeholder={isThinking ? "Thinking..." : "Ask me anything..."}
          autoComplete="off"
          disabled={isThinking}
        />

        <button type="submit" disabled={isThinking}>
          <img src="/arrow.png" alt="Send" />
        </button>
      </form>
    </div>
  );
};

export default NewPrompt;