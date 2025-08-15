"use client"

import { useEffect, useState } from "react"
import { socket } from "../socket.js"
import ChatPopup from "./ChatPopup.jsx"

export default function Teacher({ onBack }) {
  const [step, setStep] = useState("create")
  const [pollId, setPollId] = useState(null)
  const [question, setQuestion] = useState("")
  const [options, setOptions] = useState(["", ""])
  const [timeLimit, setTimeLimit] = useState(60)
  const [students, setStudents] = useState([])
  const [results, setResults] = useState(null)
  const [showParticipants, setShowParticipants] = useState(false)
  const [canAskNext, setCanAskNext] = useState(true)
  const [pollHistory, setPollHistory] = useState([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    socket.emit("teacher:createPoll", null, ({ pollId }) => {
      setPollId(pollId)
    })

    const onStudents = (list) => setStudents(list)
    const onResults = (r) => {
      setResults(r)
      setStep("results")
      setCanAskNext(false)
      setTimeout(() => setCanAskNext(true), 2000)
    }

    socket.on("poll:students", onStudents)
    socket.on("poll:results", onResults)

    return () => {
      socket.off("poll:students", onStudents)
      socket.off("poll:results", onResults)
    }
  }, [])

  const handleAskQuestion = () => {
    const validOptions = options.filter((opt) => opt.trim())
    if (!question.trim() || validOptions.length < 2) return

    socket.emit(
      "teacher:ask",
      {
        pollId,
        q: question.trim(),
        options: validOptions,
        timeLimitSec: timeLimit,
      },
      (res) => {
        if (!res.ok) {
          alert(res.error || "Cannot ask question")
        } else {
          setStep("waiting")
        }
      },
    )
  }

  const addOption = () => {
    setOptions([...options, ""])
  }

  const updateOption = (index, value) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const removeStudent = (name) => {
    socket.emit("teacher:removeStudent", { pollId, name })
  }

  const askNewQuestion = () => {
    setStep("create")
    setQuestion("")
    setOptions(["", ""])
    setResults(null)
  }

  const viewPollHistory = () => {
    socket.emit("poll:history", { pollId }, (response) => {
      if (response.ok) {
        setPollHistory(response.history)
        setShowHistory(true)
      }
    })
  }

  const backToResults = () => {
    setShowHistory(false)
  }

  if (step === "create") {
    return (
      <div className="app-container">
        <div className="main-card wide-card">
          <div className="brand-badge">Intervue Poll</div>
          <h1 className="main-title">Let's Get Started</h1>
          <p className="subtitle">
            You'll have the ability to create and manage polls, ask questions, and monitor your students' responses in
            real-time.
          </p>
          <div className="question-form">
            <div className="form-group">
              <label className="form-label">Enter your question</label>
              <input
                className="input-field"
                placeholder="Which planet is known as the Red Planet?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="time-selector">
              <span className="form-label">{timeLimit} seconds</span>
              <select className="time-select" value={timeLimit} onChange={(e) => setTimeLimit(Number(e.target.value))}>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={90}>90 seconds</option>
                <option value={120}>120 seconds</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Edit Options</label>
              <div className="options-list">
                {options.map((option, index) => (
                  <div key={index} className="option-input">
                    <input
                      className="input-field"
                      placeholder={`Option ${index + 1}`}
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <button className="add-option-btn" onClick={addOption}>
                + Add More option
              </button>
            </div>
            <div className="form-group">
              <label className="form-label">Is it Correct?</label>
              <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="radio" name="correct" value="yes" />
                  Yes
                </label>
                <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input type="radio" name="correct" value="no" />
                  No
                </label>
              </div>
            </div>
          </div>
          <button
            className="primary-btn"
            onClick={handleAskQuestion}
            disabled={!question.trim() || options.filter((o) => o.trim()).length < 2}
          >
            Ask Question
          </button>
          {pollId && (
            <div style={{ marginTop: "20px", textAlign: "center", color: "#6b7280" }}>
              Poll ID: <strong style={{ fontSize: "18px", color: "#6366f1" }}>{pollId}</strong>
              <br />
              <small>Share this ID with students to join</small>
            </div>
          )}
        </div>
        {pollId && <ChatPopup pollId={pollId} who="Teacher" isTeacher={true} students={students} />}
      </div>
    )
  }

  if (step === "waiting") {
    return (
      <div className="app-container">
        <div className="main-card">
          <div className="brand-badge">Intervue Poll</div>
          <div className="loading-spinner"></div>
          <div className="waiting-message">Waiting for students to answer...</div>
          <div style={{ marginTop: "20px", color: "#6b7280" }}>
            Poll ID: <strong>{pollId}</strong>
          </div>
        </div>
        {pollId && <ChatPopup pollId={pollId} who="Teacher" isTeacher={true} students={students} />}
      </div>
    )
  }

  if (step === "results") {
    const total = results?.total || 0
    if (showHistory) {
      return (
        <div className="app-container">
          <div className="main-card wide-card">
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}
            >
              <h2 style={{ fontSize: "24px", fontWeight: "600" }}>Poll History</h2>
              <div style={{ display: "flex", gap: "12px" }}>
                <button className="primary-btn" onClick={backToResults}>
                  ← Back to Current Results
                </button>
                <button className="back-btn" onClick={onBack}>
                  ← Back
                </button>
              </div>
            </div>

            {pollHistory.length === 0 ? (
              <div style={{ textAlign: "center", color: "#6b7280", padding: "40px" }}>
                <h3 style={{ fontSize: "18px", marginBottom: "8px" }}>No Previous Polls</h3>
                <p>Poll history will appear here after you complete some questions.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {pollHistory.map((poll, index) => {
                  const total = poll.total || 0
                  const pollDate = new Date(poll.endedAt).toLocaleString()
                  return (
                    <div
                      key={index}
                      style={{
                        border: "2px solid #e5e7eb",
                        borderRadius: "12px",
                        padding: "20px",
                        background: "#fafafa",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: "16px",
                        }}
                      >
                        <h3 style={{ fontSize: "18px", fontWeight: "600", color: "#374151" }}>
                          Poll #{pollHistory.length - index}
                        </h3>
                        <span style={{ color: "#6b7280", fontSize: "14px" }}>{pollDate}</span>
                      </div>

                      <div className="question-container" style={{ marginBottom: "16px" }}>
                        {poll.q}
                      </div>

                      <div className="results-container">
                        {poll.options.map((option) => {
                          const votes = poll.votes[option] || 0
                          const percentage = total > 0 ? Math.round((votes / total) * 100) : 0
                          return (
                            <div key={option} className="result-item">
                              <div className="result-header">
                                <span className="result-option">{option}</span>
                                <span className="result-percentage">
                                  {percentage}% ({votes} votes)
                                </span>
                              </div>
                              <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${percentage}%` }}>
                                  {percentage > 15 ? option : ""}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>

                      <div style={{ marginTop: "12px", color: "#6b7280", fontSize: "14px" }}>
                        Total responses: {total}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {pollId && <ChatPopup pollId={pollId} who="Teacher" isTeacher={true} students={students} />}
        </div>
      )
    }

    return (
      <div className="app-container">
        <div className="main-card wide-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h2 style={{ fontSize: "24px", fontWeight: "600" }}>Question</h2>
            <div style={{ display: "flex", gap: "12px" }}>
              <button className="history-btn" onClick={viewPollHistory}>
                📊 View Poll History
              </button>
              <button className="back-btn" onClick={onBack}>
                ← Back
              </button>
            </div>
          </div>

          <div className="question-container">{results?.q}</div>
          <div style={{ display: "flex", gap: "24px" }}>
            <div style={{ flex: 2 }}>
              <div className="results-container">
                {results?.options.map((option) => {
                  const votes = results.votes[option] || 0
                  const percentage = total > 0 ? Math.round((votes / total) * 100) : 0
                  return (
                    <div key={option} className="result-item">
                      <div className="result-header">
                        <span className="result-option">{option}</span>
                        <span className="result-percentage">{percentage}%</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${percentage}%` }}>
                          {percentage > 15 ? option : ""}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button
                className="primary-btn"
                onClick={askNewQuestion}
                disabled={!canAskNext}
                style={{ marginTop: "24px" }}
              >
                + Ask a new question
              </button>
            </div>
            <div style={{ flex: 1 }}>
              <div className="participants-panel">
                <div className="participants-header">
                  <h3 className="participants-title">Participants</h3>
                  <button
                    className="primary-btn"
                    style={{ fontSize: "12px", padding: "8px 16px" }}
                    onClick={() => setShowParticipants(!showParticipants)}
                  >
                    {showParticipants ? "Hide" : "Show"}
                  </button>
                </div>
                {showParticipants && (
                  <div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        borderBottom: "2px solid #e5e7eb",
                        fontWeight: "600",
                      }}
                    >
                      <span>Name</span>
                      <span>Action</span>
                    </div>
                    {students.map((student) => (
                      <div key={student.name} className="participant-item">
                        <span>{student.name}</span>
                        <button className="kick-btn" onClick={() => removeStudent(student.name)}>
                          Kick out
                        </button>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <div style={{ textAlign: "center", color: "#6b7280", padding: "20px" }}>No participants yet</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {pollId && <ChatPopup pollId={pollId} who="Teacher" isTeacher={true} students={students} />}
      </div>
    )
  }

  return null
}
