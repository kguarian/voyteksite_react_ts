import React from 'react';
import logo from './logo.svg';
import { initializeFirebase, FirebaseComponent } from './components/Firebase/Firebase';
import './App.css';

function App() {
  initializeFirebase();
  return (
    <div className="App">
      
    <FirebaseComponent />

    </div>
  );
}

export default App;
