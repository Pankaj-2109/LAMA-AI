import "./chatPage.css";
import NewPrompt from "../../components/newPrompt/NewPrompt";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";
import Markdown from "react-markdown";
import { IKImage } from "imagekitio-react";
import { useAuth } from "@clerk/clerk-react";

const ChatPage = () => {
  const { getToken } = useAuth();
  const path = useLocation().pathname;
  const chatId = path.split("/").pop();

  const { isPending, error, data } = useQuery({
    queryKey: ["chat", chatId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(
        `https://lama-ai-1bq2.onrender.com/api/chats/${chatId}`,
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
    // Keep internal configurations sharp for dynamic paths
    staleTime: 0,
    gcTime: 0, // Prevents layout ghosting across separate open tabs
    refetchOnMount: "always",
  });

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

          {/* Render new input form once base metadata completes validation loading */}
          {data && <NewPrompt data={data} />}
        </div>
      </div>
    </div>
  );
};

export default ChatPage;