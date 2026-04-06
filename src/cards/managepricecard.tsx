import React from 'react';
import styled from 'styled-components';

interface ManagePriceCardProps {
  boatName: string;
  ticketPrice: number;
  image?: string;
  editprice: () => void;
}

const ManagePriceCard = ({ boatName, ticketPrice, image, editprice }: ManagePriceCardProps) => {
  return (
    <StyledWrapper>
      <div className="card">
        <div className="img">
          {image ? (
            <img src={image} alt={boatName} className="boat-image" />
          ) : (
            <div className="img-placeholder">
              <svg width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="#93c5fd" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 17l4-8 5 5 3-3 4 4" />
                <path d="M3 21h18" />
              </svg>
            </div>
          )}
        </div>
        <div className="text">
          <p className="h3">{boatName}</p>
          <p className="label">Current ticket price</p>
          <p className="price">₱{Number(ticketPrice).toLocaleString()}</p>
          <button className="editBtn" onClick={editprice}>Edit Price</button>
        </div>
      </div>
    </StyledWrapper>
  );
};

const StyledWrapper = styled.div`
  .card {
    width: 100%;
    height: auto;
    background: white;
    border-radius: 16px;
    border: 1px solid #e5e7eb;
    transition: 0.2s ease-in-out;
    display: flex;
    flex-direction: row;
    align-items: center;
    padding: 24px;
    gap: 24px;
  }

  .img {
    width: 180px;
    height: 180px;
    border-radius: 16px;
    background: #dbeafe;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }

  .boat-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 16px;
  }

  .img-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .text {
    display: flex;
    flex-direction: column;
    flex: 1;
    justify-content: space-between;
    gap: 8px;
  }

  .text .h3 {
    font-family: 'Lucida Sans', sans-serif;
    font-size: 18px;
    font-weight: 700;
    color: #1e3a8a;
    margin: 0;
  }

  .label {
    font-family: 'Lucida Sans', sans-serif;
    color: #666666;
    font-size: 12px;
    margin: 8px 0 8px 0;
    font-weight: 500;
  }

  .price {
    font-family: 'Lucida Sans', sans-serif;
    font-size: 28px;
    font-weight: 700;
    color: #1e40af;
    margin: 0 0 16px 0;
  }

  .editBtn {
    padding: 12px 32px;
    background-color: #2563eb;
    color: white;
    border: none;
    border-radius: 10px;
    font-family: 'Lucida Sans', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.2s ease-in-out;
    width: fit-content;
    align-self: flex-start;
  }

  .editBtn:hover {
    background-color: #1d4ed8;
    transform: scale(1.02);
  }

  .card:hover {
    cursor: pointer;
    border-color: #2563eb;
  }
`;

export default ManagePriceCard;