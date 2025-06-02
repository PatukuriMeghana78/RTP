from flask import Flask, request, send_file
from PIL import Image
import numpy as np
import io

# Include your existing simulation, daltonize, and color space code here...

app = Flask(__name__)

@app.route("/daltonize", methods=["POST"])
def daltonize_image():
    img_file = request.files["image"]
    deficiency = request.form.get("deficiency", "d")

    img = Image.open(img_file).convert("RGB")
    rgb = np.array(img, dtype=np.float16)

    linear_rgb = gamma_correction(rgb)
    processed = daltonize(linear_rgb, color_deficit=deficiency)
    corrected = convert_back(processed)

    out_img = Image.fromarray(corrected.astype('uint8'))
    buf = io.BytesIO()
    out_img.save(buf, format='PNG')
    buf.seek(0)

    return send_file(buf, mimetype='image/png')

if __name__ == "__main__":
    app.run(debug=True)
