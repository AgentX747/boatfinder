import styled from "styled-components"

export interface BoatDetails {
 boatId: number
  image: string
  boatName: string
  vesselType: string
  capacity: number
  routeFrom: string
  routeTo: string

  capacityInformation?: number
  editBoat?: () => void
  deleteBoat?: () => void
}

export function ManageBoatsCard({
  boatId,
  image,
  boatName,
  vesselType,
  capacity,
  
  routeFrom,
  routeTo,
  editBoat,
  deleteBoat
}: BoatDetails) {
  return (
    <StyledWrapper>
      
      <div className="card">
        <div className="image-container">
          <img src={image} alt={boatName} />
          <div className="wave-overlay"></div>
        </div>
        
        
        <div className="card-content">
          <div className="header">
            <h3>{boatName}</h3>
            <p className="vessel-type">⛵ {vesselType}</p>
          </div>

          
          
          <div className="details">
            <div className="detail-item">
              <span className="icon">👥</span>
              <span>Capacity: {capacity}</span>
            </div>
            
            <div className="detail-item">
              <span className="icon">🗺️</span>
              <span>{routeFrom} → {routeTo}</span>
            </div>
          </div>
          
          <div className="button-group">
            <button className="edit-btn" onClick={editBoat}>Edit Boat</button>
            <button className="delete-btn" onClick={deleteBoat}>Delete Boat</button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  .card {
    width: 300px;
    background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 60, 120, 0.2);
    border: 3px solid #0277bd;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
  }

  .card:hover {
    transform: translateY(-5px);
    box-shadow: 0 12px 30px rgba(0, 60, 120, 0.3);
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 200px;
    overflow: hidden;
  }

  .image-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wave-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 30px;
    background: linear-gradient(to top, rgba(2, 119, 189, 0.3), transparent);
  }

  .wave-overlay::before {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    width: 200%;
    height: 100%;
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,50 Q300,10 600,50 T1200,50 L1200,120 L0,120 Z' fill='%230277bd' fillOpacity='0.4'/%3E%3C/svg%3E");
    background-size: 50% 100%;
    animation: wave 3s linear infinite;
  }

  @keyframes wave {
    0% {
      transform: translateX(0);
    }
    100% {
      transform: translateX(-50%);
    }
  }

  .card-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .header {
    text-align: center;
    padding-bottom: 15px;
    border-bottom: 2px solid rgba(2, 119, 189, 0.2);
  }

  .header h3 {
    margin: 0 0 8px 0;
    color: #01579b;
    font-size: 24px;
    font-weight: bold;
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
  }

  .vessel-type {
    margin: 0;
    color: #0277bd;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 600;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(2, 119, 189, 0.1);
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 16px;
    color: #01579b;
    font-weight: 500;
    transition: background 0.3s ease;
  }

  .detail-item:hover {
    background: rgba(2, 119, 189, 0.2);
  }

  .icon {
    font-size: 20px;
  }

  .button-group {
    display: flex;
    gap: 10px;
    margin-top: 5px;
  }

  .button-group button {
    flex: 1;
    padding: 10px 15px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .edit-btn {
    background: #0277bd;
    color: white;
  }

  .edit-btn:hover {
    background: #01579b;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(2, 119, 189, 0.3);
  }

  .delete-btn {
    background: #f44336;
    color: white;
  }

  .delete-btn:hover {
    background: #d32f2f;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(244, 67, 54, 0.3);
  }
`