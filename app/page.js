'use client'
import { Avatar, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import ReactMarkdown from 'react-markdown';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Welcome to VALO-Scout! 
      Your go-to hub for discovering the top VALORANT players. 
      Whether you're looking for the best Jett mains or curious about who dominates with Raze, VALO-Scout has you covered. 
      Ask about any agent, and we'll connect you with the top 3 players you need to know about right now. 
      Let’s elevate your game with the best insights!`
    },
    {
      role: "assistant",
      content: `Please note that some of the content in responses related to streamers is simulated due to the absence of access to the Riot Games API.`
    }
  ]);
  const [message, setMessage] = useState('');

  const sendMessage = async () => {
    if (message.trim() === '') return; 

    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: '' }
    ]);

    setMessage('');

    const response = await fetch('/api/chat', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([...messages, { role: "user", content: message }])
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let result = '';
    return reader.read().then(function processText({ done, value }) {
      if (done) {
        return result;
      }
      const text = decoder.decode(value || new Uint8Array(), { stream: true });
      setMessages((messages) => {
        let lastMessage = messages[messages.length - 1];
        let otherMessages = messages.slice(0, messages.length - 1);
        return [
          ...otherMessages,
          { ...lastMessage, content: lastMessage.content + text },
        ];
      });

      return reader.read().then(processText);
    });
  };

  return (
    <Box width="100vw" 
      height="100vh" 
      display="flex"
      flexDirection="column" 
      alignItems="center"
      justifyContent="center"
      zIndex={10} 
    >
      
      {/* Brimstone */}
      <Stack direction="row"
        alignItems="center"
        spacing={2}
        borderBottom="2px solid black"
        borderRadius='25px'
        backgroundColor="white"
        pb={1}
        mb={2}
        padding='5px'>
        <Avatar alt="Brimstone" src="/brimstone-avatar.jpg" sx={{ width: 56, height: 56 }} />
        <Typography variant="h6">Brimstone</Typography>
      </Stack>

      <Stack direction="column"
        width="500px" 
        height="700px"
        border="3px solid black"
        backgroundColor="white"
        p={2}
        spacing={3}
        zIndex={20} 
      >
        
        <Stack direction="column" 
          spacing={2} flexGrow={1} 
          overflow={"auto"} 
          maxHeight={"100%"}>
          {
            messages.map((message, index) => (
              <Box key={index} 
                display="flex" 
                justifyContent={message.role === "assistant" ? 'flex-start' : 'flex-end'}>
                <Box bgcolor={message.role === 'assistant' ? "primary.main" : "secondary.main"}
                  color="white"
                  borderRadius={16}
                  p={3}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </Box>
              </Box>
            ))
          }
        </Stack>
        
        <Stack direction="row" spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button 
            variant='contained'
            onClick={sendMessage}>
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
