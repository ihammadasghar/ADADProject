import {useState, useEffect} from "react";
import CardGroup from 'react-bootstrap/CardGroup';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';

import EventCard from "../components/EventCard";
import EditEventModal from "../components/EditEventModal";

export default function App() {
  let [events, setEvents] = useState([]);
  let [pagination, setPagination] = useState([]);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  const getEvents = async (page) => {
    try {
      const response = await fetch('http://localhost:3000/events/?page=' + page, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        },
      });
      
      const data = await response.json();
      setEvents(data.items);
      setPagination({
        page: data.page,
        limit: data.limit,
        total: data.total,
      });

    } catch (error) {
      console.error('Error:', error);
    }
  }

  useEffect(() => {
    getEvents(1);
  }, []);

  const openEdit = (event) => {
    setSelectedEvent(event);
    setShowEdit(true);
  }

  const handleSaved = (updatedEvent) => {
    // reload events from the server
    getEvents();
    setShowEdit(false);
    setSelectedEvent(null);
  }

  return (
    <div className="container pt-5 pb-5">
      <div>
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
      <div>
        <Button onClick={() => getEvents(pagination.page - 1)}>Previous</Button>
        <Button onClick={() => getEvents(pagination.page + 1)}>Next</Button>
      </div>
    </div>
  )
}