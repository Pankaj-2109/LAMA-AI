import { useMutation, useQueryClient } from "@tanstack/react-query";
import "./dashboardPage.css";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useState } from "react";
import Upload from "../../components/upload/Upload";
import { IKImage } from "imagekitio-react";

const DashboardPage = () => {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [text, setText] = useState("");
  const [img, setImg] = useState({
    isLoading: false,
    dbData: {},
    aiData: {},
  });

  const mutation = useMutation({
    mutationFn: async ({ text, img }) => {
      const token = await getToken();
      return fetch(`${import.meta.env.VITE_API_URL || "https://lama-ai-1bq2.onrender.com"}/api/chats`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text, img }),
      }).then((res) => res.json());
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["userChats"] });
      navigate(`/dashboard/chats/${id}`);
    },
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim() && !img.dbData?.filePath) return;

    mutation.mutate({ text, img: img.dbData?.filePath || null });
  };

  return (
    <div className="dashboardPage">
      <div className="texts">
        <div className="logo">
          <img src="/logo.png" alt="" />
          <h1>LAMA AI</h1>
        </div>
        <div className="options">
          <div className="option">
            <img src="/chat.png" alt="" />
            <span>Create a New Chat</span>
          </div>
          <div className="option">
            <img src="/image.png" alt="" />
            <span>Analyze Images</span>
          </div>
          <div className="option">
            <img src="/code.png" alt="" />
            <span>Help me with my Code</span>
          </div>
        </div>
      </div>
      <div className="formContainer">
        <form onSubmit={handleSubmit} autoComplete="off">
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
              name="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Ask me anything..."
              autoComplete="off"
            />
            <button disabled={mutation.isPending || img.isLoading || (!text.trim() && !img.dbData?.filePath)}>
              <img src="/arrow.png" alt="" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DashboardPage;
