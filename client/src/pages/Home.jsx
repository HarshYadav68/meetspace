import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const Home = () => {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState("");

  const createMeeting = async () => {
    try {
      const { data } = await api.post("/meetings/create");
      navigate(`/meeting/${data.roomId}`);
    } catch (error) {
      navigate("/login");
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6 text-center">
      <h1 className="text-4xl font-bold">MeetSpace</h1>
      <p className="mt-3 text-slate-300">Your lightweight privacy first collaboration room.</p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <button onClick={createMeeting} className="rounded bg-cyan-600 px-5 py-3">
          Create Meeting
        </button>
        <input
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
          placeholder="Enter room ID"
          className="rounded bg-slate-800 px-4 py-3"
        />
        <button onClick={() => roomId && navigate(`/meeting/${roomId}`)} className="rounded bg-slate-700 px-5 py-3">
          Join Meeting
        </button>
      </div>
    </div>
  );
};

export default Home;
