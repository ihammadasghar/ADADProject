import React, {useState, useEffect} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  bufferCV,
} from '@stacks/transactions';
import { utf8ToBytes } from '@stacks/common';
import { userSession } from '../auth';
const bytes = utf8ToBytes('foo'); 
const bufCV = bufferCV(bytes);

export default function App() {
  let params = useParams();
  let [event, setEvent] = useState([]);

  const getEvent = async () => {
    try {
      const response = await fetch('http://localhost:3000/events/' + params._id, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        },
      });
      if(response.error) {
        console.log('Error:', response.error);
        return;
      }
      const data = await response.json();
      setEvent(data);

    } catch (error) {
      console.error('Error:', error);
    }
  }
  useEffect(() => {
    getEvent();
  }, []);

  return (
    <div className="container pt-5 pb-5">
      <h2>Event Infos</h2>
      <h3>{event.establishmentName}</h3>
      <p>
        Address: {event.address} <br/>
        County: {event.county}<br/>
        Zip Code: {event.zipCode}<br/>
        Establishment ID: {event.establishmentID}<br/>
        Average Score: {event.averageScore}<br/>
        Reviews Count: {event.reviewsCount}<br/>
        Last Change Date: {event.changeDate}
      </p>
    </div>
  )
}