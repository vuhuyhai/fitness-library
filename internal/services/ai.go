package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"fitness-library/internal/models"
)

type AIService struct {
	settingsGetter func(key string) string
	httpClient     *http.Client
}

func NewAIService(settingsGetter func(key string) string) *AIService {
	return &AIService{
		settingsGetter: settingsGetter,
		httpClient:     &http.Client{Timeout: 60 * time.Second},
	}
}

const promptTemplate = `Bạn là trợ lý phân loại tài liệu fitness chuyên nghiệp.

Phân tích đoạn text sau và trả về JSON với format chính xác:
{"tags": ["tag1", "tag2"], "summary": "Tóm tắt 2-3 câu tiếng Việt", "read_time": 5, "level": "beginner|intermediate|advanced|general"}

Quy tắc:
- tags: 3-7 tags tiếng Việt, ngắn gọn
- summary: 2-3 câu tiếng Việt
- read_time: số phút đọc ước tính
- level: trình độ phù hợp
- Chỉ trả về JSON thuần, không có markdown, không có giải thích

Text tài liệu:
%s`

// ─── Provider routing ─────────────────────────────────────

func (s *AIService) provider() string {
	p := s.settingsGetter("ai.provider")
	if p == "" {
		return "claude"
	}
	return p
}

func (s *AIService) apiKeyForProvider(provider string) string {
	switch provider {
	case "gemini":
		return s.settingsGetter("ai.gemini_api_key")
	case "openai":
		return s.settingsGetter("ai.openai_api_key")
	default:
		return s.settingsGetter("ai.api_key")
	}
}

func (s *AIService) modelForProvider(provider string) string {
	model := s.settingsGetter("ai.model")
	if model != "" {
		return model
	}
	switch provider {
	case "gemini":
		return "gemini-2.5-flash"
	case "openai":
		return "gpt-4o-mini"
	default:
		return "claude-sonnet-4-20250514"
	}
}

func (s *AIService) callProvider(ctx context.Context, provider, apiKey, model, prompt string) (string, error) {
	switch provider {
	case "gemini":
		return s.callGemini(ctx, apiKey, model, prompt)
	case "openai":
		return s.callOpenAI(ctx, apiKey, model, prompt)
	default:
		return s.callClaude(ctx, apiKey, model, prompt)
	}
}

// ─── ProcessDocument ──────────────────────────────────────

func (s *AIService) ProcessDocument(ctx context.Context, docID, title, content string) (*models.AIResult, error) {
	provider := s.provider()
	apiKey := s.apiKeyForProvider(provider)
	if apiKey == "" {
		return nil, fmt.Errorf("API key chưa được cấu hình cho provider %s", provider)
	}
	model := s.modelForProvider(provider)

	runes := []rune(content)
	if len(runes) > 3000 {
		runes = runes[:3000]
	}
	text := "Tiêu đề: " + title + "\n\n" + string(runes)
	prompt := fmt.Sprintf(promptTemplate, text)

	result, err := s.callProvider(ctx, provider, apiKey, model, prompt)
	if err != nil {
		return nil, err
	}

	var aiResult models.AIResult
	if err := json.Unmarshal([]byte(result), &aiResult); err != nil {
		if cleaned := extractJSON(result); cleaned != result {
			if err2 := json.Unmarshal([]byte(cleaned), &aiResult); err2 == nil {
				goto parsed
			}
		}
		retryPrompt := "Respond with raw JSON only, no markdown fences.\n\n" + prompt
		result2, err2 := s.callProvider(ctx, provider, apiKey, model, retryPrompt)
		if err2 != nil {
			return nil, fmt.Errorf("AI retry failed: %w", err2)
		}
		cleaned2 := extractJSON(result2)
		if err3 := json.Unmarshal([]byte(cleaned2), &aiResult); err3 != nil {
			return nil, fmt.Errorf("không thể parse phản hồi AI: %w", err3)
		}
	}
parsed:
	if aiResult.Tags == nil {
		aiResult.Tags = []string{}
	}
	return &aiResult, nil
}

// ─── TestConnection ───────────────────────────────────────

func (s *AIService) TestConnection(ctx context.Context) error {
	provider := s.provider()
	apiKey := s.apiKeyForProvider(provider)
	if apiKey == "" {
		return fmt.Errorf("API key chưa được cấu hình cho provider %s", provider)
	}
	model := s.modelForProvider(provider)
	_, err := s.callProvider(ctx, provider, apiKey, model, `Reply with raw JSON only: {"status":"ok"}`)
	return err
}

// ─── Claude ───────────────────────────────────────────────

type claudeRequest struct {
	Model     string          `json:"model"`
	MaxTokens int             `json:"max_tokens"`
	Messages  []claudeMessage `json:"messages"`
}

type claudeMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type claudeResponse struct {
	Content []struct {
		Type string `json:"type"`
		Text string `json:"text"`
	} `json:"content"`
}

func (s *AIService) callClaude(ctx context.Context, apiKey, modelName, prompt string) (string, error) {
	reqBody := claudeRequest{
		Model:     modelName,
		MaxTokens: 512,
		Messages:  []claudeMessage{{Role: "user", Content: prompt}},
	}
	data, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Claude API error %d: %s", resp.StatusCode, string(body))
	}

	var r claudeResponse
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	if len(r.Content) == 0 {
		return "", fmt.Errorf("Claude trả về phản hồi trống")
	}
	return r.Content[0].Text, nil
}

// ─── Gemini ───────────────────────────────────────────────

type geminiRequest struct {
	Contents []geminiContent `json:"contents"`
}

type geminiContent struct {
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []geminiPart `json:"parts"`
		} `json:"content"`
	} `json:"candidates"`
}

func (s *AIService) callGemini(ctx context.Context, apiKey, modelName, prompt string) (string, error) {
	reqBody := geminiRequest{
		Contents: []geminiContent{
			{Parts: []geminiPart{{Text: prompt}}},
		},
	}
	data, _ := json.Marshal(reqBody)

	url := fmt.Sprintf("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s", modelName, apiKey)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Gemini API error %d: %s", resp.StatusCode, string(body))
	}

	var r geminiResponse
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	if len(r.Candidates) == 0 || len(r.Candidates[0].Content.Parts) == 0 {
		return "", fmt.Errorf("Gemini trả về phản hồi trống")
	}
	return r.Candidates[0].Content.Parts[0].Text, nil
}

// ─── OpenAI / ChatGPT ─────────────────────────────────────

type openAIRequest struct {
	Model     string         `json:"model"`
	MaxTokens int            `json:"max_tokens"`
	Messages  []openAIMessage `json:"messages"`
}

type openAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type openAIResponse struct {
	Choices []struct {
		Message openAIMessage `json:"message"`
	} `json:"choices"`
}

func (s *AIService) callOpenAI(ctx context.Context, apiKey, modelName, prompt string) (string, error) {
	reqBody := openAIRequest{
		Model:     modelName,
		MaxTokens: 512,
		Messages:  []openAIMessage{{Role: "user", Content: prompt}},
	}
	data, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OpenAI API error %d: %s", resp.StatusCode, string(body))
	}

	var r openAIResponse
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	if len(r.Choices) == 0 {
		return "", fmt.Errorf("OpenAI trả về phản hồi trống")
	}
	return r.Choices[0].Message.Content, nil
}

// ─── GenerateFacebookCaption ──────────────────────────────

const captionPromptTemplate = `Bạn là chuyên gia marketing fitness. Tạo caption Facebook hấp dẫn cho tài liệu sau.

Tiêu đề: %s
Tóm tắt: %s

Trả về JSON với format CHÍNH XÁC sau (không markdown, không giải thích):
{
  "captions": [
    {"tone": "motivational", "label": "Truyền Cảm Hứng", "emoji": "🔥", "content": "caption tiếng Việt 150-200 ký tự"},
    {"tone": "educational",  "label": "Chia Sẻ Kiến Thức", "emoji": "📚", "content": "caption tiếng Việt 150-200 ký tự"},
    {"tone": "personal",     "label": "Cá Nhân Hóa",      "emoji": "💪", "content": "caption tiếng Việt 150-200 ký tự"},
    {"tone": "humorous",     "label": "Hài Hước",          "emoji": "😄", "content": "caption tiếng Việt 150-200 ký tự"},
    {"tone": "challenge",    "label": "Thách Thức",        "emoji": "🏆", "content": "caption tiếng Việt 150-200 ký tự"}
  ],
  "hashtags": ["#fitness", "#sứckhỏe", 3-5 hashtag tiếng Việt liên quan đến nội dung]
}

Mỗi caption phải tự nhiên, không cứng nhắc, phù hợp với phong cách Facebook Việt Nam.`

// GenerateFacebookCaption generates 5 tone variants of a Facebook caption for a document.
func (s *AIService) GenerateFacebookCaption(ctx context.Context, docTitle, docSummary string) (*models.CaptionResult, error) {
	provider := s.provider()
	apiKey := s.apiKeyForProvider(provider)
	if apiKey == "" {
		return nil, fmt.Errorf("API key chưa được cấu hình cho provider %s", provider)
	}
	model := s.modelForProvider(provider)

	summary := docSummary
	if summary == "" {
		summary = docTitle
	}
	prompt := fmt.Sprintf(captionPromptTemplate, docTitle, summary)

	callWithMaxTokens := func(p string) (string, error) {
		switch provider {
		case "gemini":
			return s.callGemini(ctx, apiKey, model, p)
		case "openai":
			return s.callOpenAITokens(ctx, apiKey, model, p, 1024)
		default:
			return s.callClaudeTokens(ctx, apiKey, model, p, 1024)
		}
	}

	raw, err := callWithMaxTokens(prompt)
	if err != nil {
		return nil, err
	}

	var result models.CaptionResult
	cleaned := extractJSON(raw)
	if err := json.Unmarshal([]byte(cleaned), &result); err != nil {
		// retry once
		raw2, err2 := callWithMaxTokens("Respond with raw JSON only, no markdown.\n\n" + prompt)
		if err2 != nil {
			return nil, fmt.Errorf("AI caption retry failed: %w", err2)
		}
		if err3 := json.Unmarshal([]byte(extractJSON(raw2)), &result); err3 != nil {
			return nil, fmt.Errorf("không thể parse caption AI: %w", err3)
		}
	}

	result.DocTitle = docTitle
	if result.Captions == nil {
		result.Captions = []models.CaptionVariant{}
	}
	if result.Hashtags == nil {
		result.Hashtags = []string{}
	}
	return &result, nil
}

// callClaudeTokens is like callClaude but with a configurable max_tokens.
func (s *AIService) callClaudeTokens(ctx context.Context, apiKey, modelName, prompt string, maxTokens int) (string, error) {
	reqBody := claudeRequest{
		Model:     modelName,
		MaxTokens: maxTokens,
		Messages:  []claudeMessage{{Role: "user", Content: prompt}},
	}
	data, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-api-key", apiKey)
	req.Header.Set("anthropic-version", "2023-06-01")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("Claude API error %d: %s", resp.StatusCode, string(body))
	}
	var r claudeResponse
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	if len(r.Content) == 0 {
		return "", fmt.Errorf("Claude trả về phản hồi trống")
	}
	return r.Content[0].Text, nil
}

// callOpenAITokens is like callOpenAI but with a configurable max_tokens.
func (s *AIService) callOpenAITokens(ctx context.Context, apiKey, modelName, prompt string, maxTokens int) (string, error) {
	reqBody := openAIRequest{
		Model:     modelName,
		MaxTokens: maxTokens,
		Messages:  []openAIMessage{{Role: "user", Content: prompt}},
	}
	data, _ := json.Marshal(reqBody)

	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.openai.com/v1/chat/completions", bytes.NewReader(data))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OpenAI API error %d: %s", resp.StatusCode, string(body))
	}
	var r openAIResponse
	if err := json.Unmarshal(body, &r); err != nil {
		return "", err
	}
	if len(r.Choices) == 0 {
		return "", fmt.Errorf("OpenAI trả về phản hồi trống")
	}
	return r.Choices[0].Message.Content, nil
}

// ─── Helpers ──────────────────────────────────────────────

func extractJSON(s string) string {
	start := strings.Index(s, "{")
	end := strings.LastIndex(s, "}")
	if start >= 0 && end > start {
		return s[start : end+1]
	}
	return s
}
