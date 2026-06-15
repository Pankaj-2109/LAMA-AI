import { Link } from "react-router-dom";
import "./chatList.css";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@clerk/clerk-react";

const ChatList = () => {
  const { getToken } = useAuth();
  const { isPending, error, data } = useQuery({
    queryKey: ["userChats"],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(
        `${import.meta.env.VITE_API_URL}/api/userchats`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to fetch chats");
      }

      return res.json();
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  console.log("USER CHATS:", data);

  return (
    <div className="chatList">
      <span className="title">DASHBOARD</span>

      <Link to="/dashboard">Create a New Chat</Link>
      <Link to="/">Explore Lama AI</Link>
      <Link to="/">Contact</Link>

      <hr />

      <span className="title">RECENT CHATS</span>

      <div className="list">
        {isPending && <div>Loading chats...</div>}

        {error && (
          <div style={{ color: "red" }}>
            Failed to load chats
          </div>
        )}

        {!isPending &&
          !error &&
          Array.isArray(data) &&
          data.length === 0 && (
            <div>No chats yet</div>
          )}

        {!isPending &&
          !error &&
          Array.isArray(data) &&
          data.map((chat) => (
            <Link
              to={`/dashboard/chats/${chat._id}`}
              key={chat._id}
            >
              {chat.title}
            </Link>
          ))}
      </div>

      <hr />

      <div className="upgrade">
        <img src="/logo.png" alt="Lama AI" />

        <div className="texts">
          <span>Upgrade to Lama AI Pro</span>
          <span>
            Get unlimited access to all features
          </span>
        </div>
      </div>
    </div>
  );
};

export default ChatList;