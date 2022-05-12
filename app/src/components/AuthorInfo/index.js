import React from 'react';
import './AuthorInfo.css';
import twitterImg from './twitter-logo.svg';
import webImg from './website-logo.png';

const TWITTER_LINK = 'https://twitter.com/struikeny';
const WEBSITE_LINK = 'https://stevekennedy.io';

const AuthorInfo = () => {
    return (
        <div className="author-container">
            <p className="author-text">Built by Steve Kennedy</p>
            <div className="author-logo-container">
            <a href={TWITTER_LINK} target="_blank" rel="noreferrer">
                <img alt="Twitter Logo" className="author-logo" src={twitterImg} />
            </a>
            <a href={WEBSITE_LINK} target="_blank" rel="noreferrer">
                <img alt="Website Logo" className="author-logo" src={webImg} />
            </a>
        </div>
      </div>
    )
};

export default AuthorInfo;