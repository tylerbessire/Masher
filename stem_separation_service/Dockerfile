# Use an official Python runtime as a parent image
# Using a specific version can help with dependency resolution for ML libraries
FROM python:3.9.18-slim

# Set the working directory in the container
WORKDIR /app

# Copy the requirements file into the container
COPY requirements.txt .

# Install PyTorch and related libraries first, as they are large
# Using find-links can sometimes help with PyTorch installation in Docker
RUN pip install --no-cache-dir torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# Install the rest of the packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application code into the container
COPY main.py .

# Make port 8004 available to the world outside this container
EXPOSE 8004

# Define environment variables (can be overridden)
ENV PORT=8004

ENV SUPABASE_URL=""
ENV SUPABASE_SERVICE_ROLE_KEY=""

# Run main.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8004"]

