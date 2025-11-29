import React, {useState, useEffect} from "react";
import CardGroup from 'react-bootstrap/CardGroup';
import Row from 'react-bootstrap/Row';
import Button from 'react-bootstrap/Button';
import UserCard from "../components/UserCard";

export default function App() {
  let [users, setUsers] = useState([]);
  let [pagination, setPagination] = useState([]);
  
  const getUsers = async (page) => {
    try {
      const response = await fetch('http://localhost:3000/users?page=' + page, {
        method: 'GET',
        headers: {
        'Content-Type': 'application/json'
        },
      });
      const data = await response.json();
      if(data.items.length === 0){
        return;
      }
      setUsers(data.items);
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
    getUsers(1);
  }, []);

  return (
    <div className="container pt-5 pb-5">
      <div>
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
          <div>
            <Button onClick={() => getUsers(pagination.page - 1)}>Previous</Button>
            <Button onClick={() => getUsers(pagination.page + 1)}>Next</Button>
          </div>
      </div>
    </div>
  )
}