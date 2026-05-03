import React from 'react';
import styled from 'styled-components';

interface BoatDetails {
  img?: string;          // optional — image can be absent
  boatName: string;
  vesselType: string;
  capacity: string;      // string — matches NormalisedBoat & backend capacity_information
  ticketPrice: number;
  operatorName?: string;
  onViewDetails?: () => void;
}
export function ViewBoatsCard({ img, boatName, vesselType, capacity, ticketPrice, operatorName = 'N/A', onViewDetails }: BoatDetails) {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="card-inner">
          <div className="card-front">
            <div className="image-container">
              <img src={img} alt={boatName} />
              <div className="wave-overlay"></div>
            </div>
            <div className="front-content">
              <h3>{boatName}</h3>
              <p className="vessel-type">{vesselType}</p>
            </div>
          </div>
          <div className="card-back">
            <div className="back-content">
              <h3>{boatName}</h3>
              <div className="details">
                <div className="detail-item">
                  <span className="label">Capacity:</span>
                  <span>{capacity} persons</span>
                </div>
                <div className="detail-item">
                  <span className="label">Price:</span>
                  <span>₱{ticketPrice}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Type:</span>
                  <span>{vesselType}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Operator:</span>
                  <span>{operatorName}</span>
                </div>
             
              </div>
            </div>
          </div>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .card {
    width: 300px;
    height: 400px;
    perspective: 1000px;
    cursor: pointer;
  }

  .card-inner {
    width: 100%;
    height: 100%;
    position: relative;
    transform-style: preserve-3d;
    transition: transform 0.999s;
  }

  .card:hover .card-inner {
    transform: rotateY(180deg);
  }

  .card-front,
  .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 15px;
    overflow: hidden;
    box-shadow: 0 8px 20px rgba(0, 60, 120, 0.2);
  }

  .card-front {
    background: linear-gradient(135deg, #e3f2fd 0%, #ffffff 100%);
    display: flex;
    flex-direction: column;
    transform: rotateY(0deg);
    border: 3px solid #0277bd;
  }

  .image-container {
    position: relative;
    width: 100%;
    height: 60%;
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
    background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 120'%3E%3Cpath d='M0,50 Q300,10 600,50 T1200,50 L1200,120 L0,120 Z' fill='%230277bd' fill-opacity='0.4'/%3E%3C/svg%3E");
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

  .front-content {
    padding: 20px;
    background: linear-gradient(to bottom, rgba(227, 242, 253, 0.9), #ffffff);
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    position: relative;
  }

  .front-content::before {
    content: '';
    position: absolute;
    top: -15px;
    left: 50%;
    transform: translateX(-50%);
    font-size: 30px;
    opacity: 0.3;
  }

  .front-content h3 {
    margin: 0;
    color: #01579b;
    font-size: 24px;
    font-weight: bold;
    text-align: center;
    text-shadow: 1px 1px 2px rgba(255, 255, 255, 0.8);
  }

  .vessel-type {
    margin: 8px 0 0 0;
    color: #0277bd;
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }

  .card-back {
    background: linear-gradient(135deg, #0277bd 0%, #01579b 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    transform: rotateY(180deg);
    border: 3px solid #01579b;
    position: relative;
    overflow: hidden;
  }

  .card-back::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: 
      radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
  }

  .card-back::after {
    content: '';
    position: absolute;
    bottom: 10px;
    right: 10px;
    font-size: 60px;
    opacity: 0.15;
  }

  .back-content {
    color: #fff;
    text-align: center;
    z-index: 1;
    padding: 30px;
    width: 100%;
  }

  .back-content h3 {
    margin: 0 0 25px 0;
    font-size: 22px;
    font-weight: bold;
    border-bottom: 2px solid rgba(255, 255, 255, 0.3);
    padding-bottom: 15px;
  }

  .details {
    display: flex;
    flex-direction: column;
    gap: 15px;
  }

  .detail-item {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(255, 255, 255, 0.1);
    padding: 12px 20px;
    border-radius: 8px;
    backdrop-filter: blur(10px);
    font-size: 16px;
    transition: background 0.3s ease;
  }

  .detail-item:hover {
    background: rgba(255, 255, 255, 0.2);
  }

  .label {
    font-weight: 600;
    opacity: 0.9;
  }

  .view-details-btn {
    margin-top: 15px;
    padding: 12px 25px;
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border: 2px solid rgba(255, 255, 255, 0.4);
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
  }

  .view-details-btn:hover {
    background: rgba(255, 255, 255, 0.3);
    border-color: rgba(255, 255, 255, 0.6);
    transform: translateY(-2px);
  }
`;
