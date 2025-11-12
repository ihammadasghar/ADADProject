import React, {useState, useEffect} from "react";
import { useParams, useNavigate } from "react-router-dom";
import { openContractCall } from '@stacks/connect';
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

 

  useEffect(() => {
    let id = params._id;
    console.log(id);
    //getEvent(params._id);

  }, []);

  return (
    <div className="container pt-5 pb-5">
      <h2>Event page</h2>
      <p>use /events/:_id endpoint</p>

      
    </div>
  )
}