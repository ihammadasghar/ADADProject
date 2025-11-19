import {useState, useEffect} from "react";
import CardGroup from 'react-bootstrap/CardGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

import EventCard from "../components/EventCard";
import EditEventModal from "../components/EditEventModal";

export default function App() {
  let [events, setEvents] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

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

  const openEdit = (event) => {
    setSelectedEvent(event);
    setShowEdit(true);
  }

  const handleSaved = (updatedEvent) => {
    // update local list with returned event
    setEvents(prev => prev.map(e => e._id === updatedEvent._id ? updatedEvent : e));
    setShowEdit(false);
    setSelectedEvent(null);
  }

  return (
    <div className="container pt-5 pb-5">
        <h2>Events</h2>
        <CardGroup>
            <Row xs={1} md={2} className="d-flex justify-content-around">
            {events && events.map((event) => {
                return (
                    <Col key={event._id} className="mb-3">
                      <EventCard 
                          event={event}
                          openEdit={openEdit}
                      />
                    </Col>
                );
            })}
            </Row>
        </CardGroup>

        <EditEventModal
          show={showEdit}
          event={selectedEvent}
          onClose={() => { setShowEdit(false); setSelectedEvent(null); }}
          onSaved={handleSaved}
        />
    </div>
  )
}