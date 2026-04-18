"""Quick test: does PoseLandmarker detect multiple people from webcam?"""
import cv2
import mediapipe as mp
import os

model_path = os.path.join(os.path.dirname(__file__), "pose_landmarker.task")

base_opts = mp.tasks.BaseOptions(model_asset_path=model_path)
options = mp.tasks.vision.PoseLandmarkerOptions(
    base_options=base_opts,
    running_mode=mp.tasks.vision.RunningMode.IMAGE,
    num_poses=6,
    min_pose_detection_confidence=0.3,
    min_pose_presence_confidence=0.3,
    min_tracking_confidence=0.3,
)
detector = mp.tasks.vision.PoseLandmarker.create_from_options(options)

cap = cv2.VideoCapture(0)
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)

print("Press 'q' to quit. Watch the terminal for detection counts.")
print("Make sure multiple people are visible in the frame.\n")

frame_count = 0
while True:
    ret, frame = cap.read()
    if not ret:
        break

    rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
    result = detector.detect(mp_image)

    num = len(result.pose_landmarks) if result.pose_landmarks else 0
    frame_count += 1

    if frame_count % 10 == 0:
        print(f"Frame {frame_count}: {num} person(s) detected")

    # Draw count on frame
    cv2.putText(frame, f"People: {num}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

    cv2.imshow("Multi-person test", frame)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
detector.close()
