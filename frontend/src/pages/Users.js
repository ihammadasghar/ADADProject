import React, {useState, useEffect} from "react";
import CardGroup from 'react-bootstrap/CardGroup';
import Row from 'react-bootstrap/Row';
import UserCard from "../components/UserCard";

export default function App() {
  let [users, setUsers] = useState([]);
  const getUsers = async () => {
    try {
      const response = await fetch('http://localhost:3000/users', {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        },
      });
      
      const data = await response.json();
      console.log(data)
      setUsers(data.items);

    } catch (error) {
      console.error('Error:', error);
    }
  }
  useEffect(() => {
    getUsers();
  }, []);

  return (
    <div className="container pt-5 pb-5">
      <h2>Users Page</h2>
      <CardGroup>
            <Row xs={1} md={2} className="d-flex justify-content-around">
            {users && users.map((user) => {
                return (
                    <UserCard 
                        key={user._id} 
                        {...user}
                    />
                );
            })}
            </Row>
        </CardGroup>
    </div>
  )
}