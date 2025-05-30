import React, { useState, useRef, useEffect } from 'react';
import styles from '../styles/Chatting.module.scss';
import useIsAuthenticated from 'react-auth-kit/hooks/useIsAuthenticated';
import { Navigate } from 'react-router-dom';
import { Client } from '@stomp/stompjs';

const Chatting = () => {
  const isAuthenticated = useIsAuthenticated();
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: '안녕하세요! 채팅을 시작하세요.',
      sender: 'system',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [chatRooms, setChatRooms] = useState([
    {
      id: 1,
      name: '디지털 상품 채팅',
      lastMessage: '안녕하세요! 물건 판매 중인가요?',
      unread: 2,
    },
    { id: 2, name: '의류 거래방', lastMessage: '네 내일 만나요', unread: 0 },
    {
      id: 3,
      name: '책 교환 그룹',
      lastMessage: '가격은 얼마인가요?',
      unread: 1,
    },
  ]);
  const [selectedRoom, setSelectedRoom] = useState(1);
  const messagesEndRef = useRef(null);
  const [client, setClient] = useState(null);

  // 메시지 자동 스크롤
  useEffect(() => {
    const stompClient = new Client({
      brokerURL: 'ws://localhost:8080/ws', // Spring 서버의 WebSocket 엔드포인트
      reconnectDelay: 5000,
      onConnect: () => {
        console.log('STOMP 연결됨');

        // 메시지 수신 구독
        stompClient.subscribe(`/topic/chat/room/${selectedRoom}`, (message) => {
          const received = JSON.parse(message.body);
          setMessages((prev) => [
            ...prev,
            {
              ...received,
              id: prev.length + 1,
            },
          ]);
        });
      },
      onStompError: (frame) => {
        console.error('STOMP 에러:', frame.headers['message']);
      },
    });

    stompClient.activate();
    setClient(stompClient); // 나중에 메시지 보낼 때 사용

    return () => {
      stompClient.deactivate(); // cleanup
    };
  }, [selectedRoom]);

  if (!isAuthenticated) return <Navigate to={'/'} replace />;

  // 메시지 전송 핸들러
  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!client || inputText.trim() === '') return;

    const userMessage = {
      sender: 'user',
      text: inputText,
      roomId: selectedRoom,
      timestamp: new Date(),
    };

    client.publish({
      destination: '/app/chat/message', // Spring의 @MessageMapping 경로
      body: JSON.stringify(userMessage),
    });

    setInputText('');
  };

  // 채팅방 선택 핸들러
  const handleRoomSelect = (roomId) => {
    setSelectedRoom(roomId);
    // 실제로는 여기서 해당 채팅방의 메시지를 불러오는 API 호출이 필요합니다
    // 테스트를 위해 메시지를 초기화하고 새 메시지 추가
    setMessages([
      {
        id: 1,
        text: `채팅방 ${roomId}에 오신 것을 환영합니다!`,
        sender: 'system',
        timestamp: new Date(),
      },
    ]);
  };

  // 메시지 시간 포맷팅
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.chatContainer}>
      {/* 채팅방 목록 */}
      <div className={styles.chatRoomsList}>
        <div className={styles.chatRoomsHeader}>
          <h2>채팅 목록</h2>
          <button className={styles.newChatBtn}>+ 새 채팅</button>
        </div>
        <div className={styles.chatRooms}>
          {chatRooms.map((room) => (
            <div
              key={room.id}
              className={`${styles.chatRoom} ${selectedRoom === room.id ? styles.selected : ''}`}
              onClick={() => handleRoomSelect(room.id)}
            >
              <div className={styles.chatRoomAvatar}>{room.name.charAt(0)}</div>
              <div className={styles.chatRoomInfo}>
                <div className={styles.chatRoomName}>{room.name}</div>
                <div className={styles.chatRoomLastMessage}>
                  {room.lastMessage}
                </div>
              </div>
              {room.unread > 0 && (
                <div className={styles.unreadBadge}>{room.unread}</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 채팅 메시지 영역 */}
      <div className={styles.chatBox}>
        <div className={styles.chatHeader}>
          <h2>
            {chatRooms.find((room) => room.id === selectedRoom)?.name || '채팅'}
          </h2>
          <div className={styles.chatActions}>
            <button className={styles.actionBtn}>⋮</button>
          </div>
        </div>

        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.sender === 'user'
                  ? styles.userMessage
                  : message.sender === 'system'
                    ? styles.systemMessage
                    : styles.otherMessage
              }`}
            >
              <div className={styles.messageContent}>
                <p>{message.text}</p>
                <span className={styles.timestamp}>
                  {formatTime(new Date(message.timestamp))}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <form className={styles.messageForm} onSubmit={handleSendMessage}>
          <input
            type='text'
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder='메시지를 입력하세요...'
            className={styles.messageInput}
          />
          <button type='submit' className={styles.sendButton}>
            전송
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chatting;
