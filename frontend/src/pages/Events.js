import React, {useState, useEffect} from "react";
import CardGroup from 'react-bootstrap/CardGroup';
import Row from 'react-bootstrap/Row';

import EventCard from "../components/EventCard";

export default function App() {
  let [events, setEvents] = useState([]);

  const getEvents = async () => {
    try {
      const response = await fetch('http://localhost:3000/events', {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        },
      });
      
      const data = await response.json();
      console.log(data)
      setEvents(data.items);

    } catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    getEvents();
  }, []);

  return (
    <div className="container pt-5 pb-5">
        <h2>Events</h2>
        <CardGroup>
            <Row xs={1} md={2} className="d-flex justify-content-around">
            {events && events.map((event) => {
                return (
                    <EventCard 
                        key={event._id} 
                        {...event}
                    />
                );
            })}
            </Row>
        </CardGroup>
    </div>
  )
}