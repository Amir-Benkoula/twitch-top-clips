export interface Clip {
  id: string;
  url: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  broadcaster_name: string;
  duration: number;
}

export interface GameInfo {
  id: string;
  name: string;
  box_art_url: string;
}

export interface GameData {
  game_info: GameInfo;
  top_clips: Clip[];
}

export interface StreamerInfo {
  id: string;
  name: string;
  login: string;
  profile_image_url: string;
}

export interface StreamerData {
  streamer_info: StreamerInfo;
  top_clips: Clip[];
}

export interface GeneratedClip {
  filename: string;
  url: string;
  createdAt: string;
}

export interface ApiResponse {
  success: boolean;
  timestamp: string;
  data: (GameData | StreamerData | GeneratedClip)[];
}
