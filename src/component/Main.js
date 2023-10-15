
import React from 'react';
import {useNavigate} from "react-router-dom"
 
 
const Main = () => {
  const navigate = useNavigate();
  let username = "";
  let sessionId = "";
  let role;

  function handleUserName(e) {
    username = e.target.value
   }

  function handleSessionId(e) {
    sessionId = e.target.value
  }

  function handleRole(e) {
    role = e.target.value
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (username.length === 0 ||sessionId.length === 0 ) {
      return;
    } 
 
     navigate('/home', {state:{
      name: username,
      session: sessionId,
      role: role
     }})
   }

  return (
    <div style={containerStyle}>
      <form>
      <div className="board-row">
      <label htmlFor="user-name">User name:-</label>
        <input
          id="user-name"
          onChange={handleUserName} />
      </div>

      <div className="board-row">
      <label htmlFor="session-id">Session id:-  </label>
        <input
          id="session-id"
          onChange={handleSessionId}/>
      </div>
      <div className="board-row">
      <label htmlFor="role">Role:-  </label>
        <input
          id="role"
          onChange={handleRole}/>
      </div>
      <div style={squareStyle}>
      <button onClick={handleSubmit} type="button">Ok </button>
      </div>
      </form>
    </div>
  );
};

export default Main;

const squareStyle = {
    margin: "4px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  };
  
const containerStyle = {
    marginTop: "100px",
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
};
  
 