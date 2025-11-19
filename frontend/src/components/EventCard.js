import Button from 'react-bootstrap/Button';
import Card from 'react-bootstrap/Card';

function EventCard(props) {
  return (
    <Card style={{ width: '18rem' }} className="mb-3">
      <Card.Body>
        <Card.Title>{props.event.establishmentName}</Card.Title>
        <Card.Text>
          {/* id: {props._id} */}
        </Card.Text>
        <Button href={"/events/" + props.event._id} variant="outline-primary">Open Event</Button>
        <Button variant="outline-primary" onClick={() => props.openEdit(props.event)}>Edit</Button>
      </Card.Body>
    </Card>
  );
}

export default EventCard;