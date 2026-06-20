import "./chatPage.css";
import NewPrompt from "../../components/newPrompt/NewPrompt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import { useAuth } from "@clerk/clerk-react";
import { useState, useEffect, useRef } from "react";

const ChatPage = () => {
  const { getToken } = useAuth();
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();

  const [messages, setMessages] = useState([]);
  const endRef = useRef(null);

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || "https://lama-ai-1bq2.onrender.com"}/api/chats/${chatId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch chat");
      }

      return res.json();
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
  });

  // Auto-scroll like ChatGPT when history or active streaming messages update
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data, messages]);

  return (
    <div className="chatPage">
      <div className="wrapper">
        <div className="chat">
          {isPending && <div>Loading...</div>}

          {error && <div>Something went wrong!</div>}

          {!isPending &&
            !error &&
            data?.history?.map((message, i) => (
              <div
                key={i}
                className={
                  message.role === "user"
                    ? "messageWrapper userWrapper"
                    : "messageWrapper aiWrapper"
                }
              >
                {message.img && (
                  <IKImage
                    urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                    path={message.img}
                    height="300"
                    width="400"
                    transformation={[{ height: 300, width: 400 }]}
                    loading="lazy"
                  />
                )}

                <div
                  className={
                    message.role === "user"
                      ? "message user"
                      : "message"
                  }
                >
                  <Markdown>
                    {message?.parts?.[0]?.text || ""}
                  </Markdown>
                </div>
              </div>
            ))}

          {/* Render active streaming messages */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.role === "user"
                  ? "messageWrapper userWrapper"
                  : "messageWrapper aiWrapper"
              }
            >
              {msg.role === "user" && msg.img && (
                <IKImage
                  urlEndpoint={import.meta.env.VITE_IMAGE_KIT_ENDPOINT}
                  path={msg.img}
                  width="240"
                  style={{ display: "block", borderRadius: "12px", marginBottom: "8px" }}
                />
              )}
              <div
                className={
                  msg.role === "user"
                    ? "message user"
                    : "message"
                }
              >
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
            </div>
          ))}

          <div ref={endRef} />
        </div>
      </div>

      {/* Render input form outside the scroll wrapper at the bottom of the page */}
      {data && (
        <NewPrompt
          data={data}
          messages={messages}
          setMessages={setMessages}
        />
      )}
    </div>
  );
};

export default ChatPage;