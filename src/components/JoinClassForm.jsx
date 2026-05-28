import { useState } from "react";

export default function JoinClassForm({ isJoining, onJoin }) {
  const [classCode, setClassCode] = useState("");
  const canSubmit = classCode.trim() && !isJoining;

  async function handleSubmit(event) {
    event.preventDefault();

    if (!canSubmit) return;

    await onJoin(classCode);
    setClassCode("");
  }

  return (
    <form className="stacked-form" onSubmit={handleSubmit}>
      <label>
        Class code
        <input
          autoComplete="off"
          inputMode="text"
          onChange={(event) => setClassCode(event.target.value)}
          placeholder="DGD-P3-A91F"
          value={classCode}
        />
      </label>

      <button className="primary-button button-fit" disabled={!canSubmit} type="submit">
        {isJoining ? "Joining class..." : "Join class"}
      </button>
    </form>
  );
}
