import './App.css';

import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {
  AppConfig,
  UserSession,
  AuthDetails,
  showConnect,
} from "@stacks/connect";
import { useState, useEffect } from "react";
import { userSession } from './auth';

import 'bootstrap/dist/css/bootstrap.css';
import Navigation from "./components/Navigation";
import Home from "./pages/Home";
import Events from "./pages/Events";
import Users from "./pages/Users";
import Event from "./pages/Event";
import User from "./pages/User";
import Footer from './components/Footer';

function App() {
  const [userData, setUserData] = useState(undefined);

  useEffect(() => {
    if (userSession.isSignInPending()) {
      userSession.handlePendingSignIn().then((userData) => {
        setUserData(userData);
      });
    } else if (userSession.isUserSignedIn()) {
      setUserData(userSession.loadUserData());
    }
  }, []);

  return (
    <div className="App">
      <Router>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/events" element={<Events />} />
          <Route path="/users" element={<Users />} />
          <Route path="/events/:_id" element={<Event />} />
          <Route path="/users/:_id" element={<User />} />
        </Routes>
        <Footer />
      </Router>
    </div>
    
  );
}

export default App;
