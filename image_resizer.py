input_dir = "./input"
output_dir = "./output"
quality = 80
extention = ".jpg"
img_format = "JPEG"

# Make it smaller but not bigger
max_size = (854, 854)  # (width, height)

import os
import shutil
import imagesize

from tqdm import tqdm
from PIL import Image

def resize(input_path, output_path):
    image = Image.open(input_path)

    image.thumbnail(max_size, Image.LANCZOS)    #  NEAREST | BOX | BILINEAR | HAMMING | BICUBIC | LANCZOS

    image = image.convert('RGB')
    image.save(output_path, img_format, quality=quality)

    n_size= imagesize.get(output_path)
    o_size = imagesize.get(input_path)

    shutil.copystat(input_path, output_path)
    tqdm.write(f"Resized - [{o_size[0]}, {o_size[1]}] to [{n_size[0]}, {n_size[1]}] - {output_path[-30:]}")


def main():

    if not os.path.exists(input_dir):
        os.makedirs(input_dir)

	input_files = os.listdir(input_dir)

	for file in tqdm(input_files):
		filename = os.path.splitext(file)[0]
		input_path = os.path.join(input_dir, file)
		output_path = os.path.join(output_dir, filename + extention)
		resize(input_path, output_path)


if __name__ == '__main__':
	main()

# Ref
# https://pillow.readthedocs.io/en/stable/reference/Image.html
# https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html