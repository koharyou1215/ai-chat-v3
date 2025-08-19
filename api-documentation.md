# API Documentation

This document outlines the available API endpoints for the AI Chat application.

## AI Endpoints

*   `/api/ai/inspiration/suggest`
    *   **Method**: `POST`
    *   **Description**: Generates reply suggestions based on the current conversation history.

*   `/api/ai/inspiration/enhance`
    *   **Method**: `POST`
    *   **Description**: Enhances a user-provided text snippet with more detail and emotional expression.

## Data Management Endpoints

*   `/api/characters`
    *   **Method**: `GET`, `POST`
    *   **Description**: 
        *   `GET`: Retrieves a list of all available character definition files.
        *   `POST`: Creates or updates a character definition file.

*   `/api/personas`
    *   **Method**: `GET`
    *   **Description**: Retrieves a list of all available persona definition files.

## File Upload Endpoints

*   `/api/upload/image`
    *   **Method**: `POST`
    *   **Description**: Uploads an image file to the server and returns the public URL. Used for character/persona avatars and backgrounds.

## Voice Synthesis Endpoints

*   `/api/voice/elevenlabs`
    *   **Method**: `POST`
    *   **Description**: Synthesizes text into speech using the ElevenLabs API.

*   `/api/voice/voicevox`
    *   **Method**: `POST`
    *   **Description**: Synthesizes text into speech using the VoiceVox API.
