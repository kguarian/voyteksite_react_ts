import React from "react";
import logo from "./logo.svg";
import {
  initializeFirebase,
  FirebaseComponent,
} from "./components/Firebase/Firebase";
import "./App.css";
import Details from "./components/Details/Details";

function App() {
  initializeFirebase();
  return (
    <div className="App">
      <Details />
      
      <FirebaseComponent />
    </div>
  );
}

export default App;
