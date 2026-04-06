import React from 'react';
import styled from 'styled-components';

export default function HomePageCard({img, title, description} : {img: string, title: string, description: string}) {
  return (
    <StyledWrapper>
      <div className="card shadow">
        <div className="image-container">
          <img src={img} alt={title} />
        </div>
        <div className="content">
          <h2 className="title">{title}</h2>
          <p className="description">{description}</p>
        </div>
      </div>
    </StyledWrapper>
  );
}

const StyledWrapper = styled.div`
  .card {
    width: 100%;
    max-width: 350px;
    background: white;
    border-radius: 10px;
    transition: border-radius 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .shadow {
    box-shadow: inset 0 -3em 3em rgba(0,0,0,0.1),
                0 0 0 2px rgb(190, 190, 190),
                0.3em 0.3em 1em rgba(0,0,0,0.3);
  }

  .image-container {
    width: 100%;
    height: 200px;
    overflow: hidden;
    background: #f0f0f0;
    position: relative;
  }

  .image-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;       /* keeps aspect ratio */
  object-position: center; /* crops from center */
  display: block;
}


  .content {
    padding: 1.5rem;
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0;
  }

  .description {
    font-size: 0.875rem;
    color: #666;
    line-height: 1.5;
    margin: 0;
  }
`;