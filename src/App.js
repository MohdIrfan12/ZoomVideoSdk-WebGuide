import React from "react";
import {BrowserRouter,Routes,Route} from "react-router-dom";
import Main from "./component/Main";
import Home from "./component/Home";

function App() {
	
return (
	<>
	<BrowserRouter>
	<Routes>
		<Route exact path="/" element={<Main/>}/>
		<Route exact path="/home" element={<Home/>}/>
	</Routes>
	</BrowserRouter>
	</>
);
}

export default App;